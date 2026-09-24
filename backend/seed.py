"""Create demo users, posts, follows, comments, stories, DMs."""

from __future__ import annotations

import shutil
import sqlite3
import struct
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app.auth import hash_password  # noqa: E402
from app.config import DB_PATH, UPLOAD_DIR  # noqa: E402
from app.database import SessionLocal, engine, init_db  # noqa: E402
from app.helpers import attach_hashtags  # noqa: E402
from app.models import (  # noqa: E402
    Comment,
    Follow,
    Like,
    Message,
    Notification,
    Post,
    PostImage,
    Save,
    Story,
    User,
    UserSettings,
)

SEED_DIR = UPLOAD_DIR / "seed"

PALETTES = [
    ((255, 99, 72), (255, 184, 108)),
    ((116, 185, 255), (9, 132, 227)),
    ((162, 155, 254), (108, 92, 231)),
    ((85, 239, 196), (0, 184, 148)),
    ((255, 118, 117), (214, 48, 49)),
    ((253, 203, 110), (225, 112, 85)),
    ((129, 236, 236), (0, 206, 201)),
    ((223, 230, 233), (99, 110, 114)),
]


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def write_bmp(path: Path, width: int, height: int, palette_i: int) -> None:
    c1, c2 = PALETTES[palette_i % len(PALETTES)]
    row_stride = (width * 3 + 3) & ~3
    pixel_size = row_stride * height
    header = 54
    data = bytearray(header + pixel_size)
    data[0:2] = b"BM"
    struct.pack_into("<I", data, 2, header + pixel_size)
    struct.pack_into("<I", data, 10, header)
    struct.pack_into("<I", data, 14, 40)
    struct.pack_into("<i", data, 18, width)
    struct.pack_into("<i", data, 22, height)
    struct.pack_into("<H", data, 26, 1)
    struct.pack_into("<H", data, 28, 24)
    struct.pack_into("<I", data, 34, pixel_size)
    for y in range(height):
        t = y / max(height - 1, 1)
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        # decorative bands
        band = 40 if (y // 80) % 2 == 0 else 0
        offset = header + y * row_stride
        for x in range(width):
            rr, gg, bb = r, g, b
            cx, cy = width // 3, height // 3
            if (x - cx) ** 2 + (y - cy) ** 2 < 120 ** 2:
                rr, gg, bb = min(255, r + 40), min(255, g + 20), min(255, b + 10)
            if abs(x - width * 2 // 3) < 8:
                rr = min(255, rr + band)
            data[offset + x * 3 : offset + x * 3 + 3] = bytes((bb, gg, rr))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def download_jpg(path: Path, key: str, w: int, h: int) -> bool:
    url = f"https://picsum.photos/seed/{key}/{w}/{h}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 insta-clone"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        if len(data) < 1000:
            return False
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return True
    except Exception as exc:
        print("image download skipped:", key, exc)
        return False


def seed_image(stem: str, w: int, h: int, palette_i: int) -> str:
    jpg = SEED_DIR / f"{stem}.jpg"
    if download_jpg(jpg, stem, w, h):
        return f"/uploads/seed/{stem}.jpg"
    bmp = SEED_DIR / f"{stem}.bmp"
    write_bmp(bmp, w, h, palette_i)
    return f"/uploads/seed/{stem}.bmp"


def reset_db():
    engine.dispose()
    for extra in (DB_PATH, Path(str(DB_PATH) + "-wal"), Path(str(DB_PATH) + "-shm")):
        if extra.exists():
            extra.unlink()
    if SEED_DIR.exists():
        shutil.rmtree(SEED_DIR)
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    init_db()


def seed():
    reset_db()
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    people = [
        {
            "username": "demo",
            "email": "demo@insta.local",
            "full_name": "데모 사용자",
            "bio": "인스타그램 클론 데모 계정입니다.",
            "website": "https://example.com",
            "avatar_title": "D",
        },
        {
            "username": "travel_mia",
            "email": "mia@insta.local",
            "full_name": "박미아",
            "bio": "여행 기록. 다음 목적지는 제주.",
            "website": "",
            "avatar_title": "M",
        },
        {
            "username": "foodie_ken",
            "email": "ken@insta.local",
            "full_name": "최켄",
            "bio": "맛집 탐험가 | 서울",
            "website": "",
            "avatar_title": "K",
        },
        {
            "username": "studio_ara",
            "email": "ara@insta.local",
            "full_name": "김아라",
            "bio": "사진 · 패션 · 일상",
            "website": "https://ara.studio",
            "avatar_title": "A",
        },
        {
            "username": "nightowl",
            "email": "owl@insta.local",
            "full_name": "이노아",
            "bio": "도시의 밤을 담습니다.",
            "website": "",
            "avatar_title": "N",
        },
        {
            "username": "plant_jun",
            "email": "jun@insta.local",
            "full_name": "서준",
            "bio": "식물과 함께하는 하루 #식물",
            "website": "",
            "avatar_title": "J",
            "is_private": True,
        },
        {
            "username": "test",
            "email": "test@gmail.com",
            "full_name": "테스트 사용자",
            "bio": "모든 페이지 확인용 테스트 계정입니다.",
            "website": "",
            "avatar_title": "T",
            "password": "12345",
        },
        {
            "username": "admin",
            "email": "admin@insta.local",
            "full_name": "관리자",
            "bio": "서비스 관리자 계정입니다.",
            "website": "",
            "avatar_title": "A",
            "password": "pass123",
            "is_admin": True,
        },
    ]

    users: list[User] = []
    for i, p in enumerate(people):
        avatar_url = seed_image(f"avatar_{p['username']}", 400, 400, i)
        user = User(
            username=p["username"],
            email=p["email"],
            hashed_password=hash_password(
                p.get("password")
                or ("demo1234" if p["username"] == "demo" else "pass1234")
            ),
            full_name=p["full_name"],
            bio=p["bio"],
            website=p["website"],
            avatar_url=avatar_url,
            is_private=bool(p.get("is_private")),
            is_admin=bool(p.get("is_admin")),
            created_at=iso(now - timedelta(days=30 - i)),
            settings=UserSettings(suggest_account=not p.get("is_admin")),
        )
        db.add(user)
        users.append(user)
    db.commit()
    for u in users:
        db.refresh(u)
    by_name = {u.username: u for u in users}

    posts_spec = [
        ("travel_mia", "한옥 골목 아침. #여행 #서울", "북촌, 서울"),
        ("travel_mia", "바다 위 노을이 전부였다. #여행 #노을", "부산"),
        ("travel_mia", "창밖 풍경만으로 충분한 날. #주말", "제주"),
        ("foodie_ken", "이 라멘 한 그릇이면 충분. #맛집 #라멘", "성수"),
        ("foodie_ken", "크로와상은 버터가 답이다. #베이커리", "한남"),
        ("foodie_ken", "비 오는 날의 칼국수. #맛집", "종로"),
        ("studio_ara", "오늘의 무드. #패션 #데일리룩", "성수"),
        ("studio_ara", "필름 감성으로. #필름", "홍대"),
        ("studio_ara", "빛이 들어오는 자리. #스튜디오", "서울"),
        ("nightowl", "한강 다리 불빛. #밤 #도시", "한강"),
        ("nightowl", "비 온 뒤 아스팔트. #밤", "강남"),
        ("plant_jun", "새 잎이 났다. #식물", "집"),
        ("plant_jun", "주말 물주기 완료. #식물 #주말", "집"),
        ("nightowl", "옥상 위에서 본 서울. #밤 #도시", "이태원"),
        ("plant_jun", "창가 몬스테라. #식물", "집"),
        ("demo", "클론 앱 첫 게시물. #안녕", "서울"),
        ("demo", "피드가 이렇게 채워집니다. #일상", ""),
        ("demo", "주말 산책. #일상 #서울", "한강"),
        ("test", "테스트 계정으로 올린 첫 사진. #테스트", "서울"),
        ("test", "저장·댓글·좋아요를 확인하는 게시물입니다. #일상", "성수"),
        ("test", "해시태그 검색용 게시물. #여행 #테스트", "부산"),
    ]

    posts: list[Post] = []
    for i, (uname, caption, location) in enumerate(posts_spec):
        url = seed_image(f"post_{i:02d}", 1080, 1080, i)
        created = now - timedelta(hours=40 - i * 2)
        post = Post(
            user_id=by_name[uname].id,
            image_url=url,
            caption=caption,
            location=location,
            created_at=iso(created),
        )
        db.add(post)
        posts.append(post)
    db.commit()
    for i, p in enumerate(posts):
        db.refresh(p)
        db.add(PostImage(post_id=p.id, image_url=p.image_url, sort_order=0))
        if i == 0:
            extra_a = seed_image("post_00_b", 1080, 1080, 3)
            extra_b = seed_image("post_00_c", 1080, 1080, 5)
            db.add(PostImage(post_id=p.id, image_url=extra_a, sort_order=1))
            db.add(PostImage(post_id=p.id, image_url=extra_b, sort_order=2))
        attach_hashtags(db, p, p.caption)
    db.commit()

    follow_pairs = [
        ("demo", "travel_mia"),
        ("demo", "foodie_ken"),
        ("demo", "studio_ara"),
        ("demo", "nightowl"),
        ("travel_mia", "demo"),
        ("travel_mia", "studio_ara"),
        ("foodie_ken", "demo"),
        ("foodie_ken", "travel_mia"),
        ("studio_ara", "nightowl"),
        ("studio_ara", "demo"),
        ("nightowl", "studio_ara"),
        ("nightowl", "plant_jun"),
        ("plant_jun", "demo"),
        ("plant_jun", "foodie_ken"),
        ("test", "travel_mia"),
        ("test", "foodie_ken"),
        ("test", "studio_ara"),
        ("test", "nightowl"),
        ("test", "plant_jun"),
        ("travel_mia", "test"),
        ("foodie_ken", "test"),
    ]
    for a, b in follow_pairs:
        db.add(Follow(follower_id=by_name[a].id, following_id=by_name[b].id, created_at=iso(now - timedelta(days=3))))
    db.commit()

    like_pairs = [
        (0, "demo"),
        (0, "foodie_ken"),
        (0, "test"),
        (3, "demo"),
        (3, "travel_mia"),
        (3, "test"),
        (6, "demo"),
        (6, "test"),
        (9, "demo"),
        (15, "travel_mia"),
        (18, "travel_mia"),
        (19, "foodie_ken"),
    ]
    for idx, uname in like_pairs:
        db.add(Like(user_id=by_name[uname].id, post_id=posts[idx].id, created_at=iso(now - timedelta(hours=2))))
        if by_name[uname].id != posts[idx].user_id:
            db.add(
                Notification(
                    user_id=posts[idx].user_id,
                    actor_id=by_name[uname].id,
                    type="like",
                    post_id=posts[idx].id,
                    is_read=False,
                    created_at=iso(now - timedelta(hours=2)),
                )
            )
    comments = [
        (0, "demo", "여기 진짜 예쁘다"),
        (0, "test", "테스트 계정에서 남긴 댓글입니다."),
        (3, "travel_mia", "다음에 같이 가요"),
        (6, "nightowl", "색감이 좋다"),
        (15, "studio_ara", "환영해요!"),
        (18, "travel_mia", "테스트 피드 잘 보여요!"),
        (19, "foodie_ken", "저장 탭도 확인해 보세요."),
    ]
    for idx, uname, text in comments:
        db.add(
            Comment(
                user_id=by_name[uname].id,
                post_id=posts[idx].id,
                content=text,
                created_at=iso(now - timedelta(hours=1)),
            )
        )
        if by_name[uname].id != posts[idx].user_id:
            db.add(
                Notification(
                    user_id=posts[idx].user_id,
                    actor_id=by_name[uname].id,
                    type="comment",
                    post_id=posts[idx].id,
                    is_read=False,
                    created_at=iso(now - timedelta(hours=1)),
                )
            )
    db.add(Save(user_id=by_name["demo"].id, post_id=posts[0].id, created_at=iso(now)))
    db.add(Save(user_id=by_name["demo"].id, post_id=posts[6].id, created_at=iso(now)))
    db.add(Save(user_id=by_name["test"].id, post_id=posts[0].id, created_at=iso(now)))
    db.add(Save(user_id=by_name["test"].id, post_id=posts[6].id, created_at=iso(now)))

    for i, uname in enumerate(["demo", "travel_mia", "foodie_ken", "studio_ara", "test"]):
        url = seed_image(f"story_{uname}", 540, 960, i + 2)
        created = now - timedelta(hours=i + 1)
        db.add(
            Story(
                user_id=by_name[uname].id,
                image_url=url,
                created_at=iso(created),
                expires_at=iso(created + timedelta(hours=24)),
            )
        )

    db.add(
        Message(
            sender_id=by_name["travel_mia"].id,
            receiver_id=by_name["demo"].id,
            content="피드 잘 봤어요. 여행 사진 더 올려요!",
            is_read=False,
            created_at=iso(now - timedelta(hours=5)),
        )
    )
    db.add(
        Message(
            sender_id=by_name["demo"].id,
            receiver_id=by_name["travel_mia"].id,
            content="고마워요 미아!",
            is_read=True,
            created_at=iso(now - timedelta(hours=4)),
        )
    )
    db.add(
        Notification(
            user_id=by_name["demo"].id,
            actor_id=by_name["travel_mia"].id,
            type="message",
            post_id=None,
            is_read=False,
            created_at=iso(now - timedelta(hours=5)),
        )
    )
    db.add(
        Notification(
            user_id=by_name["demo"].id,
            actor_id=by_name["plant_jun"].id,
            type="follow",
            post_id=None,
            is_read=False,
            created_at=iso(now - timedelta(days=1)),
        )
    )
    db.add(
        Message(
            sender_id=by_name["travel_mia"].id,
            receiver_id=by_name["test"].id,
            content="테스트 계정으로 메시지함을 확인해 보세요.",
            is_read=False,
            created_at=iso(now - timedelta(hours=3)),
        )
    )
    db.add(
        Message(
            sender_id=by_name["test"].id,
            receiver_id=by_name["travel_mia"].id,
            content="네, 잘 보여요!",
            is_read=True,
            created_at=iso(now - timedelta(hours=2)),
        )
    )
    db.add(
        Message(
            sender_id=by_name["demo"].id,
            receiver_id=by_name["foodie_ken"].id,
            content="",
            post_id=posts[3].id,
            is_read=False,
            created_at=iso(now - timedelta(hours=6)),
        )
    )
    db.add(
        Notification(
            user_id=by_name["test"].id,
            actor_id=by_name["travel_mia"].id,
            type="message",
            post_id=None,
            is_read=False,
            created_at=iso(now - timedelta(hours=3)),
        )
    )
    db.add(
        Notification(
            user_id=by_name["test"].id,
            actor_id=by_name["foodie_ken"].id,
            type="follow",
            post_id=None,
            is_read=False,
            created_at=iso(now - timedelta(hours=8)),
        )
    )
    db.commit()
    db.close()

    con = sqlite3.connect(DB_PATH)
    tables = [
        row[0]
        for row in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1"
        )
    ]
    print("시드 완료.")
    print("tables:", ", ".join(tables))
    for name in tables:
        count = con.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
        print(f"  {name}: {count}")
    print("journal_mode:", con.execute("PRAGMA journal_mode").fetchone()[0])
    print("로그인: demo / demo1234  |  test@gmail.com / 12345  |  관리자 admin / pass123")
    con.close()


if __name__ == "__main__":
    seed()
