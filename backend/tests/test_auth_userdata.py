# Auth (register/login/me/refresh/logout/lockout), protected YouTube routes, per-user /api/me data & isolation
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
MAIN_EMAIL = "driver@carplayyoutube.com"
MAIN_PW = "Drive2026!"


def _email():
    return f"qa+{uuid.uuid4().hex[:10]}@carplayyoutube.com"


def _item(vid, title="t"):
    return {"videoId": vid, "title": title, "channelTitle": "c", "thumbnail": ""}


def _register():
    s = requests.Session()
    email = _email()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!x", "name": "QA"})
    assert r.status_code == 200, r.text
    return s, email, r


@pytest.fixture(scope="module")
def main_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": MAIN_EMAIL, "password": MAIN_PW})
    if r.status_code != 200:
        pytest.skip(f"main login failed {r.status_code}")
    return s


# --- Auth ---
class TestAuth:
    def test_register_sets_cookies_and_me(self):
        s, email, r = _register()
        assert r.json()["email"] == email
        assert "password_hash" not in r.json()
        assert "access_token" in s.cookies and "refresh_token" in s.cookies
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200 and me.json()["email"] == email

    def test_register_duplicate_409(self):
        s, email, _ = _register()
        r = requests.post(f"{API}/auth/register", json={"email": email.upper(), "password": "Passw0rd!x"})
        assert r.status_code == 409

    def test_register_short_password_422(self):
        r = requests.post(f"{API}/auth/register", json={"email": _email(), "password": "short"})
        assert r.status_code == 422

    def test_register_invalid_email_422(self):
        r = requests.post(f"{API}/auth/register", json={"email": "notanemail", "password": "Passw0rd!x"})
        assert r.status_code == 422

    def test_login_httponly_cookies(self):
        r = requests.post(f"{API}/auth/login", json={"email": MAIN_EMAIL, "password": MAIN_PW})
        assert r.status_code == 200
        sc = r.headers.get("set-cookie", "")
        assert "access_token=" in sc and "refresh_token=" in sc and "HttpOnly" in sc

    def test_me_unauth_401(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_bearer_fallback(self):
        r = requests.post(f"{API}/auth/login", json={"email": MAIN_EMAIL, "password": MAIN_PW})
        tok = r.cookies.get("access_token")
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert me.status_code == 200 and me.json()["email"] == MAIN_EMAIL

    def test_refresh_and_logout(self):
        s, email, _ = _register()
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200 and r.json()["email"] == email
        # refresh token cannot be used as access
        rt = s.cookies.get("refresh_token")
        assert requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {rt}"}).status_code == 401
        lo = s.post(f"{API}/auth/logout")
        assert lo.status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 401

    def test_refresh_without_cookie_401(self):
        assert requests.post(f"{API}/auth/refresh").status_code == 401

    def test_bruteforce_lockout(self):
        s, email, _ = _register()
        codes = [requests.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass1"}).status_code
                 for _ in range(5)]
        assert codes == [401] * 5
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!x"})
        assert r.status_code == 429


# --- Protected YouTube routes ---
class TestYoutube:
    def test_status_public(self):
        r = requests.get(f"{API}/youtube/status")
        assert r.status_code == 200 and "configured" in r.json()

    def test_search_requires_auth(self):
        assert requests.get(f"{API}/youtube/search", params={"q": "lofi"}).status_code == 401

    def test_video_requires_auth(self):
        assert requests.get(f"{API}/youtube/video/M7lc1UVf-VE").status_code == 401

    def test_search_and_video_auth(self, main_session):
        r = main_session.get(f"{API}/youtube/search", params={"q": "lofi", "maxResults": 3})
        assert r.status_code == 200 and len(r.json()["items"]) > 0
        v = main_session.get(f"{API}/youtube/video/M7lc1UVf-VE")
        assert v.status_code == 200 and v.json()["videoId"] == "M7lc1UVf-VE"


# --- User data & isolation ---
class TestUserData:
    def test_unauth_401(self):
        for m, p in [("get", "/me/data"), ("get", "/me/queue"), ("get", "/me/settings")]:
            assert getattr(requests, m)(f"{API}{p}").status_code == 401
        assert requests.put(f"{API}/me/queue", json={"items": []}).status_code == 401
        assert requests.put(f"{API}/me/settings", json={}).status_code == 401

    def test_queue_put_validate_dedupe(self):
        s, _, _ = _register()
        assert s.get(f"{API}/me/data").json() == {"queue": [], "settings": {
            "autoplayNext": True, "autoplayRelated": True, "promptAddToQueue": True, "quality": "auto"}}
        bad = s.put(f"{API}/me/queue", json={"items": [_item("short")]})
        assert bad.status_code == 422
        r = s.put(f"{API}/me/queue", json={"items": [_item("aaaaaaaaaaa"), _item("aaaaaaaaaaa"), _item("bbbbbbbbbbb")]})
        assert r.status_code == 200
        assert [i["videoId"] for i in s.get(f"{API}/me/queue").json()["items"]] == ["aaaaaaaaaaa", "bbbbbbbbbbb"]

    def test_merge_dedupes(self):
        s, _, _ = _register()
        s.put(f"{API}/me/queue", json={"items": [_item("aaaaaaaaaaa")]})
        r = s.post(f"{API}/me/queue/merge", json={"items": [_item("aaaaaaaaaaa"), _item("ccccccccccc")]})
        assert r.status_code == 200
        assert [i["videoId"] for i in r.json()["queue"]] == ["aaaaaaaaaaa", "ccccccccccc"]
        assert "settings" in r.json()

    def test_settings(self):
        s, _, _ = _register()
        assert s.put(f"{API}/me/settings", json={"quality": "ultra"}).status_code == 422
        body = {"autoplayNext": False, "autoplayRelated": False, "promptAddToQueue": False, "quality": "high"}
        assert s.put(f"{API}/me/settings", json=body).status_code == 200
        assert s.get(f"{API}/me/settings").json() == body

    def test_isolation(self):
        a, _, _ = _register()
        b, _, _ = _register()
        a.put(f"{API}/me/queue", json={"items": [_item("ddddddddddd")]})
        a.put(f"{API}/me/settings", json={"quality": "low", "promptAddToQueue": False})
        # user_id params ignored
        b_data = b.get(f"{API}/me/data", params={"user_id": a.get(f"{API}/auth/me").json()["id"]}).json()
        assert b_data["queue"] == []
        assert b_data["settings"]["quality"] == "auto"
        assert a.get(f"{API}/me/settings").json()["quality"] == "low"
