import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
import uuid
import hashlib
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

JWT_ALGORITHM = "HS256"
ACCESS_TTL = timedelta(minutes=15)
REFRESH_TTL = timedelta(days=7)
MAX_FAILED = 5
MAX_FAILED_PER_EMAIL = 20
LOCKOUT = timedelta(minutes=15)

COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "1") != "0"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _hash_jti(jti: str) -> str:
    return hashlib.sha256(jti.encode("utf-8")).hexdigest()


def _token(user_id: str, kind: str, ttl: timedelta, jti: Optional[str] = None) -> str:
    payload = {"sub": user_id, "type": kind, "exp": datetime.now(timezone.utc) + ttl}
    if jti:
        payload["jti"] = jti
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def _set_cookie(response: Response, key: str, value: str, ttl: timedelta):
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=int(ttl.total_seconds()),
        path="/",
    )


async def _create_refresh_record(db, user_id: str, jti: str, expires_at: datetime):
    rec = {
        "user_id": ObjectId(user_id),
        "jti_hash": _hash_jti(jti),
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    }
    await db.refresh_tokens.insert_one(rec)


async def _consume_refresh_record(db, jti: str):
    """Atomically find and delete the refresh record. Return the user_id (as ObjectId) if found."""
    jh = _hash_jti(jti)
    res = await db.refresh_tokens.find_one_and_delete({"jti_hash": jh})
    if not res:
        return None
    return res.get("user_id")


def _decode(token: str) -> dict:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload


def _public_user(user: dict) -> dict:
    created = user.get("created_at")
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name") or "",
        "created_at": created.isoformat() if isinstance(created, datetime) else created,
    }


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(default="", max_length=60)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


def create_auth(db):
    router = APIRouter(prefix="/auth", tags=["auth"])

    async def _find_user(user_id: str):
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            raise HTTPException(status_code=401, detail="Not authenticated")
        user = await db.users.find_one({"_id": oid})
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return user

    async def get_current_user(request: Request) -> dict:
        token = request.cookies.get("access_token")
        if not token:
            header = request.headers.get("Authorization", "")
            if header.startswith("Bearer "):
                token = header[7:]
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        payload = _decode(token)
        if payload.get("type") != "access" or not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Not authenticated")
        user = await _find_user(payload["sub"])
        return _public_user(user)

    @router.post("/register")
    async def register(body: RegisterBody, response: Response):
        email = body.email.lower().strip()
        if await db.users.find_one({"email": email}):
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        doc = {
            "email": email,
            "password_hash": hash_password(body.password),
            "name": (body.name or "").strip(),
            "created_at": datetime.now(timezone.utc),
        }
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id

        # issue tokens (access + refresh) and persist refresh jti
        user_id = str(res.inserted_id)
        access = _token(user_id, "access", ACCESS_TTL)
        refresh_jti = str(uuid.uuid4())
        refresh = _token(user_id, "refresh", REFRESH_TTL, jti=refresh_jti)
        await _create_refresh_record(db, user_id, refresh_jti, datetime.now(timezone.utc) + REFRESH_TTL)

        # set cookies for compatibility with existing tests / clients
        _set_cookie(response, "access_token", access, ACCESS_TTL)
        _set_cookie(response, "refresh_token", refresh, REFRESH_TTL)

        return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "expires_in": int(ACCESS_TTL.total_seconds()), "user": _public_user(doc)}

    @router.post("/login")
    async def login(body: LoginBody, request: Request, response: Response):
        email = body.email.lower().strip()
        # Per IP+email (5) and per email regardless of IP (20, defeats X-Forwarded-For rotation).
        limits = {f"{_client_ip(request)}:{email}": MAX_FAILED, f"email:{email}": MAX_FAILED_PER_EMAIL}
        now = datetime.now(timezone.utc)
        attempts = {}
        for identifier in limits:
            attempt = await db.login_attempts.find_one({"identifier": identifier}) or {}
            locked_until = attempt.get("locked_until")
            if locked_until and locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until and locked_until > now:
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
            attempts[identifier] = 0 if locked_until else attempt.get("count", 0)
        user = await db.users.find_one({"email": email})
        if not user or not verify_password(body.password, user["password_hash"]):
            for identifier, limit in limits.items():
                count = attempts[identifier] + 1
                update = {"count": count, "updated_at": now, "locked_until": None}
                if count >= limit:
                    update = {"count": 0, "updated_at": now, "locked_until": now + LOCKOUT}
                await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        await db.login_attempts.delete_many({"identifier": {"$in": list(limits)}})

        user_id = str(user["_id"])
        access = _token(user_id, "access", ACCESS_TTL)
        refresh_jti = str(uuid.uuid4())
        refresh = _token(user_id, "refresh", REFRESH_TTL, jti=refresh_jti)
        await _create_refresh_record(db, user_id, refresh_jti, datetime.now(timezone.utc) + REFRESH_TTL)

        _set_cookie(response, "access_token", access, ACCESS_TTL)
        _set_cookie(response, "refresh_token", refresh, REFRESH_TTL)

        return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "expires_in": int(ACCESS_TTL.total_seconds()), "user": _public_user(user)}

    @router.get("/me")
    async def me(request: Request):
        return await get_current_user(request)

    @router.post("/refresh")
    async def refresh(request: Request, response: Response):
        token = request.cookies.get("refresh_token")
        if not token:
            # support Authorization: Bearer <refresh-token>
            header = request.headers.get("Authorization", "")
            if header.startswith("Bearer "):
                token = header[7:]
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        payload = _decode(token)
        if payload.get("type") != "refresh" or not payload.get("sub") or not payload.get("jti"):
            raise HTTPException(status_code=401, detail="Not authenticated")

        # consume (delete) the old refresh record to prevent reuse
        old_jti = payload.get("jti")
        user_objid = await _consume_refresh_record(db, old_jti)
        if not user_objid:
            raise HTTPException(status_code=401, detail="Not authenticated")

        user = await _find_user(str(user_objid))

        # rotate: issue new refresh token and record
        new_jti = str(uuid.uuid4())
        new_refresh = _token(str(user_objid), "refresh", REFRESH_TTL, jti=new_jti)
        await _create_refresh_record(db, str(user_objid), new_jti, datetime.now(timezone.utc) + REFRESH_TTL)

        # issue new access token
        access = _token(str(user_objid), "access", ACCESS_TTL)

        # set cookies for compatibility
        _set_cookie(response, "access_token", access, ACCESS_TTL)
        _set_cookie(response, "refresh_token", new_refresh, REFRESH_TTL)

        return {"access_token": access, "refresh_token": new_refresh, "token_type": "bearer", "expires_in": int(ACCESS_TTL.total_seconds()), "user": _public_user(user)}

    @router.post("/logout")
    async def logout(request: Request, response: Response):
        # try to consume refresh token if present
        token = request.cookies.get("refresh_token")
        if not token:
            header = request.headers.get("Authorization", "")
            if header.startswith("Bearer "):
                token = header[7:]
        if token:
            try:
                payload = _decode(token)
                if payload.get("type") == "refresh" and payload.get("jti"):
                    await _consume_refresh_record(db, payload.get("jti"))
            except HTTPException:
                # ignore decode errors during logout
                pass
        # delete cookies client-side
        response.delete_cookie("access_token", path="/", secure=COOKIE_SECURE, httponly=True, samesite="lax")
        response.delete_cookie("refresh_token", path="/", secure=COOKIE_SECURE, httponly=True, samesite="lax")
        return {"ok": True}

    async def ensure_indexes():
        await db.users.create_index("email", unique=True)
        await db.login_attempts.create_index("identifier", unique=True)
        await db.user_queues.create_index("user_id", unique=True)
        await db.user_settings.create_index("user_id", unique=True)
        # refresh token store indexes
        await db.refresh_tokens.create_index("jti_hash", unique=True)
        # expire records automatically after expires_at
        await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)

    return router, get_current_user, ensure_indexes
