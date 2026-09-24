"""Smoke-test live API against backend.md using the seeded SQLite file."""

from __future__ import annotations

import io
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def png_file(name: str = "t.png"):
    return (name, io.BytesIO(PNG), "image/png")


def main() -> None:
    client = TestClient(app)
    assert client.get("/api/health").json() == {"ok": True}

    guest_feed = client.get("/api/posts/feed", params={"limit": 8}).json()
    assert "items" in guest_feed and guest_feed["fallback"] is True
    assert client.get("/api/posts/explore").json()["items"]
    assert client.get("/api/stories").status_code == 200
    plant = client.get("/api/users/plant_jun").json()
    assert plant["is_private"] is True
    plant_posts = client.get("/api/users/plant_jun/posts").json()
    assert plant_posts["items"] == []

    bad = client.post("/api/auth/login", json={"username": "x", "password": "nope"})
    assert bad.status_code == 401

    login = client.post("/api/auth/login", json={"username": "test@gmail.com", "password": "12345"})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    user = login.json()["user"]
    assert user["username"] == "test" and user["email"] == "test@gmail.com"
    auth = {"Authorization": f"Bearer {token}"}

    me = client.get("/api/auth/me", headers=auth).json()
    assert me["username"] == "test"

    feed = client.get("/api/posts/feed", params={"limit": 8}, headers=auth).json()
    assert "items" in feed and "fallback" in feed
    explore = client.get("/api/posts/explore", params={"limit": 20}, headers=auth).json()
    assert explore["items"]
    post_id = explore["items"][0]["id"]

    card = client.get(f"/api/posts/{post_id}", headers=auth).json()
    assert "images" in card and "like_count" in card

    like = client.post(f"/api/posts/{post_id}/like", headers=auth).json()
    assert like["liked"] is True
    unlike = client.delete(f"/api/posts/{post_id}/like", headers=auth).json()
    assert unlike["liked"] is False
    save = client.post(f"/api/posts/{post_id}/save", headers=auth).json()
    assert save == {"saved": True}
    unsave = client.delete(f"/api/posts/{post_id}/save", headers=auth).json()
    assert unsave == {"saved": False}

    comments = client.get(f"/api/posts/{post_id}/comments", params={"limit": 100}, headers=auth).json()
    assert "items" in comments
    added = client.post(f"/api/posts/{post_id}/comments", json={"content": "api check"}, headers=auth)
    assert added.status_code == 201
    cid = added.json()["id"]
    deleted = client.delete(f"/api/comments/{cid}", headers=auth)
    assert deleted.status_code == 204

    likes = client.get(f"/api/posts/{post_id}/likes", headers=auth).json()
    assert "items" in likes

    tags = client.get("/api/hashtags", params={"q": "일상"}, headers=auth).json()
    assert "items" in tags
    by_tag = client.get("/api/posts/tag/일상", headers=auth).json()
    assert "items" in by_tag

    suggested = client.get("/api/users/suggested", headers=auth)
    assert suggested.status_code == 200 and isinstance(suggested.json(), list)
    search = client.get("/api/users/search", params={"q": "demo"}, headers=auth).json()
    assert search["items"]
    followers = client.get("/api/users/demo/followers", headers=auth).json()
    assert "items" in followers and "has_more" not in followers
    following = client.get("/api/users/test/following", headers=auth).json()
    assert "items" in following

    followed = client.post("/api/users/demo/follow", headers=auth).json()
    assert followed["is_following"] is True
    unfollowed = client.delete("/api/users/demo/follow", headers=auth).json()
    assert unfollowed["is_following"] is False

    as_test_private = client.get("/api/users/plant_jun/posts", headers=auth).json()
    assert as_test_private["items"]  # test follows plant_jun

    settings = client.get("/api/settings", headers=auth).json()
    assert settings["language"] == "ko"
    assert "notifications" in settings
    patched = client.patch("/api/settings", json={"language": "en"}, headers=auth).json()
    assert patched["language"] == "en"
    client.patch("/api/settings", json={"language": "ko"}, headers=auth)

    stories = client.get("/api/stories", headers=auth)
    assert stories.status_code == 200 and isinstance(stories.json(), list)
    created_story = client.post("/api/stories", files={"image": png_file()}, headers=auth)
    assert created_story.status_code == 201, created_story.text
    sid = created_story.json()["id"]
    assert client.delete(f"/api/stories/{sid}", headers=auth).status_code == 204

    notifs = client.get("/api/notifications", headers=auth)
    assert notifs.status_code == 200 and isinstance(notifs.json(), list)
    unread = client.get("/api/notifications/unread-count", headers=auth).json()
    assert "count" in unread
    assert client.post("/api/notifications/read", headers=auth).json() == {"ok": True}

    cons = client.get("/api/messages/conversations", headers=auth)
    assert cons.status_code == 200 and isinstance(cons.json(), list)
    thread = client.get("/api/messages/travel_mia", params={"limit": 100}, headers=auth).json()
    assert "items" in thread
    sent = client.post("/api/messages/travel_mia", json={"content": "api ping"}, headers=auth)
    assert sent.status_code == 201
    share = client.post(
        "/api/messages/travel_mia",
        json={"content": "", "post_id": post_id},
        headers=auth,
    )
    assert share.status_code == 201
    assert share.json()["post"]["id"] == post_id

    created = client.post(
        "/api/posts",
        data={"caption": "backend check #테스트", "location": "서울"},
        files={"image": png_file()},
        headers=auth,
    )
    assert created.status_code == 201, created.text
    new_id = created.json()["id"]
    edited = client.patch(f"/api/posts/{new_id}", json={"caption": "edited #안녕", "location": "부산"}, headers=auth)
    assert edited.status_code == 200
    assert client.delete(f"/api/posts/{new_id}", headers=auth).status_code == 204

    saved = client.get("/api/users/me/saved", headers=auth).json()
    assert "items" in saved

    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "apisignup@gmail.com",
            "username": "apisignup",
            "password": "pass1234",
            "full_name": "API 가입",
        },
    )
    if signup.status_code == 201:
        stoken = signup.json()["access_token"]
        sauth = {"Authorization": f"Bearer {stoken}"}
        ssettings = client.get("/api/settings", headers=sauth).json()
        assert ssettings["notifications"]["likes"] is True
    elif signup.status_code != 409:
        raise SystemExit(f"signup failed: {signup.status_code} {signup.text}")

    need_auth = client.get("/api/users/suggested")
    assert need_auth.status_code == 401

    print("API checks passed")


if __name__ == "__main__":
    main()
