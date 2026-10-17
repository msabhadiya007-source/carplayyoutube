from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

MAX_QUEUE = 200
VIDEO_ID_PATTERN = r"^[A-Za-z0-9_-]{11}$"


class QueueItem(BaseModel):
    videoId: str = Field(pattern=VIDEO_ID_PATTERN)
    title: str = Field(default="", max_length=300)
    channelTitle: str = Field(default="", max_length=200)
    thumbnail: str = Field(default="", max_length=500)
    duration: Optional[str] = Field(default=None, max_length=20)
    durationSeconds: Optional[int] = None
    publishedAt: Optional[str] = Field(default=None, max_length=40)


class QueueBody(BaseModel):
    items: List[QueueItem] = Field(max_length=MAX_QUEUE)


class Settings(BaseModel):
    autoplayNext: bool = True
    autoplayRelated: bool = True
    promptAddToQueue: bool = True
    quality: Literal["auto", "low", "medium", "high"] = "auto"


def _dedupe(items: List[dict]) -> List[dict]:
    seen, out = set(), []
    for it in items:
        if it["videoId"] in seen:
            continue
        seen.add(it["videoId"])
        out.append(it)
    return out[:MAX_QUEUE]


def create_user_data_router(db, get_current_user):
    router = APIRouter(prefix="/me", tags=["user-data"])

    async def _queue(user_id: str) -> List[dict]:
        doc = await db.user_queues.find_one({"user_id": user_id}, {"_id": 0, "items": 1})
        return doc["items"] if doc else []

    async def _save_queue(user_id: str, items: List[dict]):
        await db.user_queues.update_one(
            {"user_id": user_id},
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    async def _settings(user_id: str) -> dict:
        doc = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0, "updated_at": 0})
        return Settings(**(doc or {})).model_dump()

    @router.get("/data")
    async def get_data(user=Depends(get_current_user)):
        return {"queue": await _queue(user["id"]), "settings": await _settings(user["id"])}

    @router.get("/queue")
    async def get_queue(user=Depends(get_current_user)):
        return {"items": await _queue(user["id"])}

    @router.put("/queue")
    async def put_queue(body: QueueBody, user=Depends(get_current_user)):
        items = _dedupe([i.model_dump() for i in body.items])
        await _save_queue(user["id"], items)
        return {"items": items}

    @router.post("/queue/merge")
    async def merge_queue(body: QueueBody, user=Depends(get_current_user)):
        items = _dedupe(await _queue(user["id"]) + [i.model_dump() for i in body.items])
        await _save_queue(user["id"], items)
        return {"queue": items, "settings": await _settings(user["id"])}

    @router.get("/settings")
    async def get_settings(user=Depends(get_current_user)):
        return await _settings(user["id"])

    @router.put("/settings")
    async def put_settings(body: Settings, user=Depends(get_current_user)):
        data = body.model_dump()
        await db.user_settings.update_one(
            {"user_id": user["id"]},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        return data

    return router
