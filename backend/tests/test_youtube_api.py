"""Backend tests for CarPlayYouTube YouTube proxy endpoints (key missing scenario)."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://automotive-player-1.preview.emergentagent.com').rstrip('/')


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("message") == "CarPlayYouTube API"


def test_status_not_configured(api):
    r = api.get(f"{BASE_URL}/api/youtube/status")
    assert r.status_code == 200
    data = r.json()
    assert "configured" in data
    assert data["configured"] is False


def test_search_missing_key_returns_503(api):
    r = api.get(f"{BASE_URL}/api/youtube/search", params={"q": "test"})
    assert r.status_code == 503
    data = r.json()
    assert data.get("detail") == "API_KEY_MISSING"


def test_search_empty_query_422(api):
    r = api.get(f"{BASE_URL}/api/youtube/search", params={"q": ""})
    # min_length=1 => FastAPI validation 422
    assert r.status_code == 422


def test_video_missing_key_returns_503(api):
    r = api.get(f"{BASE_URL}/api/youtube/video/dQw4w9WgXcQ")
    assert r.status_code == 503
    assert r.json().get("detail") == "API_KEY_MISSING"


def test_no_500_errors(api):
    # Verify none of the endpoints produce 500
    for path in ["/api/youtube/status",
                 "/api/youtube/search?q=hello",
                 "/api/youtube/video/anyid"]:
        r = api.get(f"{BASE_URL}{path}")
        assert r.status_code != 500, f"{path} returned 500"
