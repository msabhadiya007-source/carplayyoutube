from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import time
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import requests


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="CarPlayYouTube API")
api_router = APIRouter(prefix="/api")

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

# Short-lived in-memory cache for identical searches (quota protection).
_search_cache = {}
_SEARCH_CACHE_TTL = 120  # seconds
MAX_RESULTS_CAP = 20


def get_api_key() -> Optional[str]:
    key = os.environ.get('YOUTUBE_API_KEY', '').strip()
    return key or None


# ---------- Models ----------
class VideoItem(BaseModel):
    videoId: str
    title: str
    channelTitle: str
    thumbnail: str
    duration: Optional[str] = None
    durationSeconds: Optional[int] = None
    publishedAt: Optional[str] = None


class SearchResponse(BaseModel):
    items: List[VideoItem]
    nextPageToken: Optional[str] = None


# ---------- Helpers ----------
def iso_duration_to_seconds(iso: str) -> int:
    if not iso:
        return 0
    m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso)
    if not m:
        return 0
    hours = int(m.group(1) or 0)
    minutes = int(m.group(2) or 0)
    seconds = int(m.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def format_duration(total: int) -> str:
    if total <= 0:
        return ""
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def pick_thumbnail(thumbs: dict) -> str:
    for key in ("medium", "high", "standard", "default", "maxres"):
        if key in thumbs and thumbs[key].get("url"):
            return thumbs[key]["url"]
    return ""


def youtube_get(path: str, params: dict):
    key = get_api_key()
    if not key:
        raise HTTPException(status_code=503, detail="API_KEY_MISSING")
    params = {**params, "key": key}
    try:
        resp = requests.get(f"{YOUTUBE_API_BASE}/{path}", params=params, timeout=15)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="NETWORK_ERROR")
    if resp.status_code == 403:
        # quota or key problems
        raise HTTPException(status_code=403, detail="QUOTA_OR_KEY_ERROR")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="YOUTUBE_API_ERROR")
    return resp.json()


# ---------- Routes ----------
@api_router.get("/")
def root():
    return {"message": "CarPlayYouTube API"}


@api_router.get("/youtube/status")
def youtube_status():
    return {"configured": get_api_key() is not None}


@api_router.get("/youtube/search", response_model=SearchResponse)
def youtube_search(
    q: str = Query(..., min_length=1, max_length=100),
    maxResults: int = 20,
    pageToken: Optional[str] = None,
):
    q = q.strip()
    if not q:
        return SearchResponse(items=[], nextPageToken=None)

    capped = min(max(maxResults, 1), MAX_RESULTS_CAP)
    cache_key = (q.lower(), pageToken or "", capped)
    now = time.time()
    cached = _search_cache.get(cache_key)
    if cached and (now - cached[0] < _SEARCH_CACHE_TTL):
        return cached[1]

    params = {
        "part": "snippet",
        "q": q,
        "type": "video",
        "maxResults": capped,
        "videoEmbeddable": "true",
    }
    if pageToken:
        params["pageToken"] = pageToken
    data = youtube_get("search", params)
    next_token = data.get("nextPageToken")
    items = data.get("items", [])
    video_ids = [it["id"]["videoId"] for it in items if it.get("id", {}).get("videoId")]
    durations = {}
    if video_ids:
        details = youtube_get("videos", {
            "part": "contentDetails",
            "id": ",".join(video_ids),
        })
        for d in details.get("items", []):
            secs = iso_duration_to_seconds(d.get("contentDetails", {}).get("duration", ""))
            durations[d["id"]] = secs

    results = []
    for it in items:
        vid = it.get("id", {}).get("videoId")
        if not vid:
            continue
        snip = it.get("snippet", {})
        secs = durations.get(vid)
        results.append(VideoItem(
            videoId=vid,
            title=snip.get("title", ""),
            channelTitle=snip.get("channelTitle", ""),
            thumbnail=pick_thumbnail(snip.get("thumbnails", {})),
            duration=format_duration(secs) if secs else None,
            durationSeconds=secs,
            publishedAt=snip.get("publishedAt"),
        ))
    response = SearchResponse(items=results, nextPageToken=next_token)
    _search_cache[cache_key] = (now, response)
    return response


@api_router.get("/youtube/video/{video_id}", response_model=VideoItem)
def youtube_video(video_id: str):
    data = youtube_get("videos", {
        "part": "snippet,contentDetails",
        "id": video_id,
    })
    items = data.get("items", [])
    if not items:
        raise HTTPException(status_code=404, detail="VIDEO_NOT_FOUND")
    it = items[0]
    snip = it.get("snippet", {})
    secs = iso_duration_to_seconds(it.get("contentDetails", {}).get("duration", ""))
    return VideoItem(
        videoId=video_id,
        title=snip.get("title", ""),
        channelTitle=snip.get("channelTitle", ""),
        thumbnail=pick_thumbnail(snip.get("thumbnails", {})),
        duration=format_duration(secs) if secs else None,
        durationSeconds=secs,
        publishedAt=snip.get("publishedAt"),
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
