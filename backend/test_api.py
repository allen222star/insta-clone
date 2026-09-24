"""Exercise core FastAPI endpoints against backend.md and print a result table."""

from __future__ import annotations

import io
import sys
import traceback
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


def png(name: str = "t.png"):
    return (name, io.BytesIO(PNG), "image/png")


class Results:
    def __init__(self):
        self.rows: list[tuple[str, str, str]] = []

    def ok(self, name: str, detail: str = ""):
        self.rows.append((name, "PASS", detail))
        print(f"  PASS  {name}" + (f"  - {detail}" if detail else ""))

    def fail(self, name: str, detail: str):
        self.rows.append((name, "FAIL", detail))
        print(f"  FAIL  {name}  - {detail}")

    def check(self, name: str, cond, detail: str = ""):
        if cond:
            self.ok(name, detail)
        else:
            self.fail(name, detail or "assertion failed")


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def login(client: TestClient, username: str, password: str):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    r.raise_for_status()
    data = r.json()
    return data["access_token"], data["user"], auth_header(data["access_token"])


def main() -> int:
    client = TestClient(app)
    r = Results()
    print("\n=== API tests ===\n")

    # --- health / guest reads ---
    h = client.get("/api/health")
    r.check("GET /api/health", h.status_code == 200 and h.json() == {"ok": True}, str(h.json()))

    feed = client.get("/api/posts/feed", params={"limit": 8})
    r.check(
        "GET /api/posts/feed (guest)",
        feed.status_code == 200
        and isinstance(feed.json().get("items"), list)
        and feed.json().get("fallback") is True,
        f"items={len(feed.json().get('items', []))} fallback={feed.json().get('fallback')}",
    )

    explore = client.get("/api/posts/explore", params={"limit": 20})
    r.check(
        "GET /api/posts/explore (guest)",
        explore.status_code == 200 and len(explore.json().get("items") or []) > 0,
        f"items={len(explore.json().get('items', []))}",
    )

    stories = client.get("/api/stories")
    r.check(
        "GET /api/stories (guest)",
        stories.status_code == 200 and isinstance(stories.json(), list),
        f"groups={len(stories.json()) if stories.status_code == 200 else stories.status_code}",
    )

    plant = client.get("/api/users/plant_jun")
    r.check(
        "GET /api/users/plant_jun (private meta public)",
        plant.status_code == 200 and plant.json().get("is_private") is True,
        str({k: plant.json().get(k) for k in ("username", "is_private", "posts_count")}),
    )

    plant_posts = client.get("/api/users/plant_jun/posts")
    r.check(
        "GET /api/users/plant_jun/posts (guest empty grid)",
        plant_posts.status_code == 200 and plant_posts.json().get("items") == [],
        str(plant_posts.json()),
    )

    sug = client.get("/api/users/suggested")
    r.check("GET /api/users/suggested (guest 401)", sug.status_code == 401, sug.text)

    # --- login failures ---
    bad = client.post("/api/auth/login", json={"username": "x", "password": "nope"})
    r.check(
        "POST /api/auth/login (wrong password 401)",
        bad.status_code == 401 and "비밀번호" in (bad.json().get("detail") or ""),
        bad.text,
    )

    # --- login success (email + username) ---
    email_login = client.post("/api/auth/login", json={"username": "test@gmail.com", "password": "12345"})
    r.check("POST /api/auth/login (email)", email_login.status_code == 200, email_login.text[:200])
    if email_login.status_code != 200:
        print("cannot continue without seed login")
        return 1
    token = email_login.json()["access_token"]
    user = email_login.json()["user"]
    headers = auth_header(token)
    r.check(
        "login payload user",
        user.get("username") == "test" and user.get("email") == "test@gmail.com" and "access_token" in email_login.json(),
        user.get("username"),
    )

    user_login = client.post("/api/auth/login", json={"username": "TEST", "password": "12345"})
    r.check("POST /api/auth/login (username NOCASE)", user_login.status_code == 200, user_login.text[:120])

    me = client.get("/api/auth/me", headers=headers)
    r.check("GET /api/auth/me", me.status_code == 200 and me.json().get("username") == "test", me.text[:200])

    no_me = client.get("/api/auth/me")
    r.check("GET /api/auth/me (no token 401)", no_me.status_code == 401, no_me.text)

    # --- signup ---
    signup_body = {
        "email": "apitest20@gmail.com",
        "username": "ApiTest20",
        "password": "pass1234",
        "full_name": "API 테스터",
    }
    signup = client.post("/api/auth/signup", json=signup_body)
    if signup.status_code == 409:
        # leftover from a previous run — log in instead
        tok, su, sauth = login(client, "apitest20", "pass1234")
        r.ok("POST /api/auth/signup", "already existed (409), reused")
    elif signup.status_code == 201:
        data = signup.json()
        tok = data["access_token"]
        su = data["user"]
        sauth = auth_header(tok)
        r.check(
            "POST /api/auth/signup",
            su.get("username") == "apitest20" and su.get("email") == "apitest20@gmail.com",
            su.get("username"),
        )
    else:
        r.fail("POST /api/auth/signup", f"{signup.status_code} {signup.text}")
        tok, su, sauth = None, None, None

    dup = client.post("/api/auth/signup", json=signup_body)
    r.check("POST /api/auth/signup (duplicate 409)", dup.status_code == 409, dup.text)

    short = client.post(
        "/api/auth/signup",
        json={"email": "shortpw@gmail.com", "username": "shortpw", "password": "12", "full_name": ""},
    )
    r.check("POST /api/auth/signup (short password 422)", short.status_code == 422, short.text)

    if sauth:
        sset = client.get("/api/settings", headers=sauth)
        r.check(
            "signup creates user_settings",
            sset.status_code == 200 and sset.json().get("notifications", {}).get("likes") is True,
            str(sset.json())[:200],
        )

    # --- password change (dedicated user) ---
    if sauth:
        bad_old = client.post(
            "/api/auth/password",
            json={"old_password": "wrong", "new_password": "newpass1"},
            headers=sauth,
        )
        r.check(
            "POST /api/auth/password (wrong old 400)",
            bad_old.status_code == 400 and "이전 비밀번호" in (bad_old.json().get("detail") or ""),
            bad_old.text,
        )
        changed = client.post(
            "/api/auth/password",
            json={"old_password": "pass1234", "new_password": "newpass1"},
            headers=sauth,
        )
        r.check("POST /api/auth/password", changed.status_code == 200 and changed.json() == {"ok": True}, changed.text)
        relog = client.post("/api/auth/login", json={"username": "apitest20", "password": "newpass1"})
        r.check("login with new password", relog.status_code == 200, relog.text[:120])
        if relog.status_code == 200:
            sauth = auth_header(relog.json()["access_token"])
        # restore original so reruns stay stable
        client.post(
            "/api/auth/password",
            json={"old_password": "newpass1", "new_password": "pass1234"},
            headers=sauth,
        )
        relog2 = client.post("/api/auth/login", json={"username": "apitest20", "password": "pass1234"})
        if relog2.status_code == 200:
            sauth = auth_header(relog2.json()["access_token"])

    # --- feed / posts as logged-in test ---
    feed2 = client.get("/api/posts/feed", params={"limit": 8}, headers=headers)
    r.check(
        "GET /api/posts/feed (auth)",
        feed2.status_code == 200 and "items" in feed2.json() and "fallback" in feed2.json(),
        f"fallback={feed2.json().get('fallback')} n={len(feed2.json().get('items', []))}",
    )

    explore2 = client.get("/api/posts/explore", params={"limit": 20}, headers=headers)
    items = explore2.json().get("items") or []
    r.check("GET /api/posts/explore (auth)", explore2.status_code == 200 and items, f"n={len(items)}")
    other_post = next((p for p in items if p.get("user", {}).get("username") != "test"), items[0] if items else None)
    own_candidates = [p for p in items if p.get("user", {}).get("username") == "test"]
    post_id = other_post["id"] if other_post else None

    if post_id:
        card = client.get(f"/api/posts/{post_id}", headers=headers)
        r.check(
            "GET /api/posts/{id}",
            card.status_code == 200 and "images" in card.json() and "like_count" in card.json(),
            f"id={post_id} likes={card.json().get('like_count')}",
        )
        missing = client.get("/api/posts/99999999")
        r.check("GET /api/posts/{id} (404)", missing.status_code == 404, missing.text)

        before = card.json()["like_count"]
        like = client.post(f"/api/posts/{post_id}/like", headers=headers)
        r.check(
            "POST /api/posts/{id}/like",
            like.status_code == 200 and like.json().get("liked") is True and like.json().get("like_count") >= before,
            str(like.json()),
        )
        like2 = client.post(f"/api/posts/{post_id}/like", headers=headers)
        r.check(
            "POST /api/posts/{id}/like (idempotent)",
            like2.status_code == 200 and like2.json().get("liked") is True,
            str(like2.json()),
        )
        likes = client.get(f"/api/posts/{post_id}/likes", headers=headers)
        r.check(
            "GET /api/posts/{id}/likes",
            likes.status_code == 200 and "items" in likes.json() and "has_more" not in likes.json(),
            f"n={len(likes.json().get('items', []))}",
        )
        unlike = client.delete(f"/api/posts/{post_id}/like", headers=headers)
        r.check(
            "DELETE /api/posts/{id}/like",
            unlike.status_code == 200 and unlike.json().get("liked") is False,
            str(unlike.json()),
        )

        save = client.post(f"/api/posts/{post_id}/save", headers=headers)
        r.check("POST /api/posts/{id}/save", save.status_code == 200 and save.json() == {"saved": True}, save.text)
        saved = client.get("/api/users/me/saved", headers=headers)
        r.check(
            "GET /api/users/me/saved",
            saved.status_code == 200 and any(p["id"] == post_id for p in saved.json().get("items", [])),
            f"n={len(saved.json().get('items', []))}",
        )
        unsave = client.delete(f"/api/posts/{post_id}/save", headers=headers)
        r.check("DELETE /api/posts/{id}/save", unsave.status_code == 200 and unsave.json() == {"saved": False}, unsave.text)

        comments = client.get(f"/api/posts/{post_id}/comments", params={"limit": 100}, headers=headers)
        r.check(
            "GET /api/posts/{id}/comments",
            comments.status_code == 200 and "items" in comments.json() and "has_more" in comments.json(),
            f"n={len(comments.json().get('items', []))}",
        )
        added = client.post(f"/api/posts/{post_id}/comments", json={"content": "api check comment"}, headers=headers)
        r.check("POST /api/posts/{id}/comments", added.status_code == 201 and added.json().get("content"), added.text[:200])
        blank = client.post(f"/api/posts/{post_id}/comments", json={"content": "   "}, headers=headers)
        r.check(
            "POST /api/posts/{id}/comments (whitespace 400/422)",
            blank.status_code in (400, 422),
            f"{blank.status_code} {blank.text}",
        )
        cid = added.json().get("id") if added.status_code == 201 else None
        if cid:
            deleted = client.delete(f"/api/comments/{cid}", headers=headers)
            r.check("DELETE /api/comments/{id}", deleted.status_code == 204, str(deleted.status_code))

    # --- hashtags ---
    tags = client.get("/api/hashtags", params={"q": "일상"})
    r.check("GET /api/hashtags", tags.status_code == 200 and "items" in tags.json(), str(tags.json())[:200])
    empty_tags = client.get("/api/hashtags", params={"q": ""})
    r.check("GET /api/hashtags (empty q)", empty_tags.json() == {"items": []}, str(empty_tags.json()))
    by_tag = client.get("/api/posts/tag/일상")
    r.check(
        "GET /api/posts/tag/{name}",
        by_tag.status_code == 200 and "items" in by_tag.json(),
        f"n={len(by_tag.json().get('items', []))}",
    )

    # --- users ---
    suggested = client.get("/api/users/suggested", headers=headers)
    r.check(
        "GET /api/users/suggested",
        suggested.status_code == 200 and isinstance(suggested.json(), list),
        f"n={len(suggested.json()) if suggested.status_code == 200 else suggested.status_code}",
    )
    search = client.get("/api/users/search", params={"q": "demo"})
    r.check(
        "GET /api/users/search",
        search.status_code == 200 and search.json().get("items") and "has_more" in search.json(),
        f"n={len(search.json().get('items', []))}",
    )
    empty_search = client.get("/api/users/search", params={"q": ""})
    r.check("GET /api/users/search (empty q)", empty_search.json().get("items") == [], str(empty_search.json()))

    followers = client.get("/api/users/demo/followers")
    r.check(
        "GET /api/users/{u}/followers",
        followers.status_code == 200 and "items" in followers.json() and "has_more" not in followers.json(),
        f"n={len(followers.json().get('items', []))}",
    )
    following = client.get("/api/users/test/following", headers=headers)
    r.check("GET /api/users/{u}/following", following.status_code == 200 and "items" in following.json())

    self_f = client.post("/api/users/test/follow", headers=headers)
    r.check("POST /api/users/{me}/follow (409)", self_f.status_code == 409, self_f.text)

    followed = client.post("/api/users/demo/follow", headers=headers)
    r.check(
        "POST /api/users/demo/follow",
        followed.status_code == 200 and followed.json().get("is_following") is True,
        str({k: followed.json().get(k) for k in ("username", "is_following", "followers_count")}),
    )
    unfollowed = client.delete("/api/users/demo/follow", headers=headers)
    r.check(
        "DELETE /api/users/demo/follow",
        unfollowed.status_code == 200 and unfollowed.json().get("is_following") is False,
        str(unfollowed.json().get("is_following")),
    )

    as_follower = client.get("/api/users/plant_jun/posts", headers=headers)
    r.check(
        "GET private posts as follower",
        as_follower.status_code == 200 and len(as_follower.json().get("items") or []) > 0,
        f"n={len(as_follower.json().get('items', []))}",
    )

    if sauth:
        as_stranger = client.get("/api/users/plant_jun/posts", headers=sauth)
        r.check(
            "GET private posts as non-follower",
            as_stranger.status_code == 200 and as_stranger.json().get("items") == [],
            str(as_stranger.json()),
        )

    # --- settings / profile ---
    settings = client.get("/api/settings", headers=headers)
    r.check(
        "GET /api/settings",
        settings.status_code == 200 and settings.json().get("language") in ("ko", "en", "ja", "zh", "es", "fr"),
        str(settings.json())[:200],
    )
    patched = client.patch("/api/settings", json={"language": "en"}, headers=headers)
    r.check("PATCH /api/settings language", patched.status_code == 200 and patched.json().get("language") == "en")
    client.patch("/api/settings", json={"language": "ko"}, headers=headers)

    priv = client.patch("/api/settings", json={"is_private": True}, headers=sauth) if sauth else None
    if priv is not None:
        r.check("PATCH /api/settings is_private", priv.status_code == 200 and priv.json().get("is_private") is True)
        grid = client.get("/api/users/apitest20/posts")
        r.check("private new user grid empty for guest", grid.json().get("items") == [], str(grid.json()))
        client.patch("/api/settings", json={"is_private": False}, headers=sauth)

    notif_off = (
        client.patch("/api/settings", json={"notifications": {"likes": False}}, headers=sauth) if sauth else None
    )
    if notif_off is not None:
        r.check(
            "PATCH /api/settings notifications.likes off",
            notif_off.status_code == 200 and notif_off.json()["notifications"]["likes"] is False,
        )

    profile = client.patch(
        "/api/users/me",
        data={"full_name": "테스트 유저", "bio": "소개글", "website": "https://example.com"},
        headers=headers,
    )
    r.check(
        "PATCH /api/users/me",
        profile.status_code == 200
        and profile.json().get("full_name") == "테스트 유저"
        and profile.json().get("bio") == "소개글",
        str({k: profile.json().get(k) for k in ("full_name", "bio", "website")}),
    )
    client.patch("/api/users/me", data={"full_name": user.get("full_name") or "", "bio": user.get("bio") or "", "website": user.get("website") or ""}, headers=headers)

    # --- create / carousel / hashtags / edit / delete ---
    created = client.post(
        "/api/posts",
        data={"caption": "backend check #테스트", "location": "서울"},
        files={"image": png("one.png")},
        headers=headers,
    )
    r.check("POST /api/posts (single image)", created.status_code == 201, created.text[:300])
    new_id = created.json().get("id") if created.status_code == 201 else None
    if new_id:
        tag_posts = client.get("/api/posts/tag/테스트")
        r.check(
            "hashtag from caption via join tables",
            any(p["id"] == new_id for p in tag_posts.json().get("items", [])),
            f"n={len(tag_posts.json().get('items', []))}",
        )
        edited = client.patch(
            f"/api/posts/{new_id}",
            json={"caption": "edited #안녕", "location": "부산"},
            headers=headers,
        )
        r.check(
            "PATCH /api/posts/{id}",
            edited.status_code == 200 and edited.json().get("caption") == "edited #안녕",
            edited.json().get("caption"),
        )
        if sauth:
            forbid = client.patch(f"/api/posts/{new_id}", json={"caption": "hack"}, headers=sauth)
            r.check("PATCH /api/posts/{id} (other user 403)", forbid.status_code == 403, forbid.text)
        shared = client.post("/api/messages/travel_mia", json={"content": "", "post_id": new_id}, headers=headers)
        r.check("share post before delete", shared.status_code == 201, shared.text[:200])
        deleted_post = client.delete(f"/api/posts/{new_id}", headers=headers)
        r.check("DELETE /api/posts/{id} after DM share", deleted_post.status_code == 204, str(deleted_post.status_code))
        admin_src = client.post(
            "/api/posts",
            data={"caption": "admin share delete", "location": ""},
            files={"image": png("admin-del.png")},
            headers=headers,
        )
        if admin_src.status_code == 201:
            aid = admin_src.json()["id"]
            client.post("/api/messages/travel_mia", json={"content": "", "post_id": aid}, headers=headers)
            try:
                _, _, aheaders = login(client, "admin", "pass123")
                gone = client.delete(f"/api/admin/posts/{aid}", headers=aheaders)
                r.check(
                    "DELETE /api/admin/posts/{id} after DM share",
                    gone.status_code == 204,
                    f"{gone.status_code} {gone.text[:120]}",
                )
            except Exception as exc:
                r.check("DELETE /api/admin/posts/{id} after DM share", False, str(exc))
        else:
            r.check("DELETE /api/admin/posts/{id} after DM share", False, admin_src.text[:200])

    carousel = client.post(
        "/api/posts",
        data={"caption": "carousel #캐러셀", "location": ""},
        files=[
            ("image", png("same.png")),
            ("images", png("same.png")),
            ("images", png("same.png")),
            ("images", png("same.png")),
        ],
        headers=headers,
    )
    r.check("POST /api/posts (carousel same filenames)", carousel.status_code == 201, carousel.text[:300])
    if carousel.status_code == 201:
        imgs = carousel.json().get("images") or []
        r.check(
            "carousel keeps 3 images with identical filenames",
            len(imgs) == 3,
            f"images={len(imgs)} {imgs}",
        )
        cid = carousel.json().get("id")
        if cid:
            client.delete(f"/api/posts/{cid}", headers=headers)

    noimg = client.post("/api/posts", data={"caption": "no image"}, headers=headers)
    r.check("POST /api/posts (no image 400/422)", noimg.status_code in (400, 422), f"{noimg.status_code} {noimg.text}")

    # --- stories ---
    created_story = client.post("/api/stories", files={"image": png()}, headers=headers)
    r.check("POST /api/stories", created_story.status_code == 201, created_story.text[:200])
    if created_story.status_code == 201:
        sid = created_story.json()["id"]
        listed = client.get("/api/stories", headers=headers)
        mine = [g for g in listed.json() if g.get("user", {}).get("username") == "test"]
        r.check("GET /api/stories (own group first)", listed.status_code == 200 and (not listed.json() or listed.json()[0]["user"]["username"] == "test" or not mine))
        gone = client.delete(f"/api/stories/{sid}", headers=headers)
        r.check("DELETE /api/stories/{id}", gone.status_code == 204, str(gone.status_code))

    # --- notifications ---
    notifs = client.get("/api/notifications", headers=headers)
    r.check(
        "GET /api/notifications",
        notifs.status_code == 200 and isinstance(notifs.json(), list),
        f"n={len(notifs.json()) if notifs.status_code == 200 else notifs.status_code}",
    )
    unread = client.get("/api/notifications/unread-count", headers=headers)
    r.check("GET /api/notifications/unread-count", unread.status_code == 200 and "count" in unread.json(), str(unread.json()))
    read = client.post("/api/notifications/read", headers=headers)
    r.check("POST /api/notifications/read", read.status_code == 200 and read.json() == {"ok": True}, read.text)
    unread2 = client.get("/api/notifications/unread-count", headers=headers)
    r.check("unread-count after read is 0", unread2.json().get("count") == 0, str(unread2.json()))

    # like as apitest20 → test should get notification if likes enabled
    if sauth and own_candidates:
        own_id = own_candidates[0]["id"]
        client.patch("/api/settings", json={"notifications": {"likes": True}}, headers=headers)
        client.post(f"/api/posts/{own_id}/like", headers=sauth)
        nlist = client.get("/api/notifications", headers=headers)
        has_like = any(n.get("type") == "like" and n.get("actor", {}).get("username") == "apitest20" for n in nlist.json())
        r.check("like creates notification for owner", has_like, f"n={len(nlist.json())}")
        client.delete(f"/api/posts/{own_id}/like", headers=sauth)

        client.patch("/api/settings", json={"notifications": {"likes": False}}, headers=headers)
        filtered = client.get("/api/notifications", headers=headers)
        still_like = any(n.get("type") == "like" for n in filtered.json())
        r.check("notify_likes off hides like from list", still_like is False, f"types={[n.get('type') for n in filtered.json()][:8]}")
        client.patch("/api/settings", json={"notifications": {"likes": True}}, headers=headers)

    # --- messages ---
    cons = client.get("/api/messages/conversations", headers=headers)
    r.check(
        "GET /api/messages/conversations",
        cons.status_code == 200 and isinstance(cons.json(), list),
        f"n={len(cons.json()) if cons.status_code == 200 else cons.status_code}",
    )
    munread = client.get("/api/messages/unread-count", headers=headers)
    r.check("GET /api/messages/unread-count", munread.status_code == 200 and "count" in munread.json(), str(munread.json()))
    thread = client.get("/api/messages/travel_mia", params={"limit": 100}, headers=headers)
    r.check(
        "GET /api/messages/{username}",
        thread.status_code == 200 and "items" in thread.json(),
        f"n={len(thread.json().get('items', []))}",
    )
    sent = client.post("/api/messages/travel_mia", json={"content": "api ping"}, headers=headers)
    r.check("POST /api/messages/{username} (text)", sent.status_code == 201, sent.text[:200])
    if post_id:
        share = client.post("/api/messages/travel_mia", json={"content": "", "post_id": post_id}, headers=headers)
        r.check(
            "POST /api/messages/{username} (share post)",
            share.status_code == 201 and (share.json().get("post") or {}).get("id") == post_id,
            str(share.json())[:240],
        )
    empty_msg = client.post("/api/messages/travel_mia", json={"content": ""}, headers=headers)
    r.check("POST /api/messages (empty 400/422)", empty_msg.status_code in (400, 422), f"{empty_msg.status_code} {empty_msg.text}")
    self_msg = client.post("/api/messages/test", json={"content": "hi"}, headers=headers)
    r.check("POST /api/messages to self (400)", self_msg.status_code == 400, self_msg.text)

    # --- restore leftover settings on apitest20 ---
    if sauth:
        client.patch(
            "/api/settings",
            json={"is_private": False, "notifications": {"likes": True, "comments": True, "follows": True, "messages": True, "stories": True}},
            headers=sauth,
        )

    print("\n=== summary ===")
    failed = [row for row in r.rows if row[1] == "FAIL"]
    print(f"passed {len(r.rows) - len(failed)} / {len(r.rows)}")
    for name, status, detail in failed:
        print(f"  {status}  {name}: {detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
