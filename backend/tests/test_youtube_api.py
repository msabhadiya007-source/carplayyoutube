"""Backend tests for CarPlayYouTube YouTube proxy endpoints.

Iteration 2: YOUTUBE_API_KEY is now configured and search returns a paginated
SearchResponse {items, nextPageToken}.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Core / status endpoints ---

def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("message") == "CarPlayYouTube API"


def test_status_configured(api):
    r = api.get(f"{BASE_URL}/api/youtube/status")
    assert r.status_code == 200
    data = r.json()
    assert data.get("configured") is True


# --- Search endpoint shape ---

def test_search_returns_items_and_token(api):
    r = api.get(f"{BASE_URL}/api/youtube/search",
                params={"q": "lofi", "maxResults": 5})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict), "response should be an object, not a bare list"
    assert "items" in data and isinstance(data["items"], list)
    assert "nextPageToken" in data  # may be None but field must be present
    assert len(data["items"]) >= 1
    first = data["items"][0]
    for key in ("videoId", "title", "channelTitle", "thumbnail"):
        assert key in first, f"missing {key} in item"
    assert isinstance(first["videoId"], str) and len(first["videoId"]) > 0


def test_search_pagination_returns_different_items(api):
    """Second page via pageToken must return different videoIds from first page."""
    r1 = api.get(f"{BASE_URL}/api/youtube/search",
                 params={"q": "lofi", "maxResults": 5})
    assert r1.status_code == 200
    d1 = r1.json()
    token = d1.get("nextPageToken")
    assert token, "nextPageToken should be present for a broad query"

    r2 = api.get(f"{BASE_URL}/api/youtube/search",
                 params={"q": "lofi", "maxResults": 5, "pageToken": token})
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert "items" in d2 and len(d2["items"]) >= 1
    ids1 = {it["videoId"] for it in d1["items"]}
    ids2 = {it["videoId"] for it in d2["items"]}
    assert ids1 != ids2, "page 2 returned same items as page 1"
    # Typically no overlap at all
    overlap = ids1 & ids2
    assert len(overlap) < len(ids2), f"too much overlap between pages: {overlap}"


def test_search_empty_query_422(api):
    r = api.get(f"{BASE_URL}/api/youtube/search", params={"q": ""})
    assert r.status_code == 422


def test_search_invalid_pagetoken_no_500(api):
    r = api.get(f"{BASE_URL}/api/youtube/search",
                params={"q": "lofi", "maxResults": 5, "pageToken": "bogus___"})
    assert r.status_code != 500, r.text


# --- Video details endpoint ---

def test_video_details_ok(api):
    r = api.get(f"{BASE_URL}/api/youtube/video/dQw4w9WgXcQ")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("videoId") == "dQw4w9WgXcQ"
    assert data.get("title")


def test_no_500_errors(api):
    for path in ["/api/youtube/status",
                 "/api/youtube/search?q=hello&maxResults=3",
                 "/api/youtube/video/dQw4w9WgXcQ"]:
        r = api.get(f"{BASE_URL}{path}")
        assert r.status_code != 500, f"{path} returned 500"
