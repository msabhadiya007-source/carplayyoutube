import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
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


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _token(user_id: str, kind: str, ttl: timedelta) -> str:
    payload = {"sub": user_id, "type": kind, "exp": datetime.now(timezone.utc) + ttl}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def _set_cookie(response: Response, key: str, value: str, ttl: timedelta):
    response.set_cookie(
        key=key, value=value, httponly=True, secure=True, samesite="lax",
        max_age=int(ttl.total_seconds()), path="/",
    )


def _issue(response: Response, user_id: str):
    _set_cookie(response, "access_token", _token(user_id, "access", ACCESS_TTL), ACCESS_TTL)
    _set_cookie(response, "refresh_token", _token(user_id, "refresh", REFRESH_TTL), REFRESH_TTL)


def _decode(token: str, kind: str) -> str:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if payload.get("type") != kind or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload["sub"]


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
        user = await _find_user(_decode(token, "access"))
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
        _issue(response, str(res.inserted_id))
        return _public_user(doc)

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
        _issue(response, str(user["_id"]))
        return _public_user(user)

    @router.get("/me")
    async def me(request: Request):
        return await get_current_user(request)

    @router.post("/refresh")
    async def refresh(request: Request, response: Response):
        token = request.cookies.get("refresh_token")
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        user = await _find_user(_decode(token, "refresh"))
        _set_cookie(response, "access_token", _token(str(user["_id"]), "access", ACCESS_TTL), ACCESS_TTL)
        return _public_user(user)

    @router.post("/logout")
    async def logout(response: Response):
        response.delete_cookie("access_token", path="/", secure=True, httponly=True, samesite="lax")
        response.delete_cookie("refresh_token", path="/", secure=True, httponly=True, samesite="lax")
        return {"ok": True}

    async def ensure_indexes():
        await db.users.create_index("email", unique=True)
        await db.login_attempts.create_index("identifier", unique=True)
        await db.user_queues.create_index("user_id", unique=True)
        await db.user_settings.create_index("user_id", unique=True)

    return router, get_current_user, ensure_indexes

