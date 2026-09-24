# 데이터베이스 설계 명세서

**프로젝트:** Andygram 클론  
**DBMS:** SQLite 3 (개발·운영 동일)  
**ORM:** SQLAlchemy 2.x  
**파일:** 로컬 `backend/instagram.db` · 서버 `backend/instagram.server.db` (`APP_ENV` / `DATABASE_URL`)  
**문자셋:** UTF-8  
**구현:** `backend/app/models.py`  
**계약:** `backend.md` §2.7 과 동일한 스키마.

---

## 1. 설계 원칙

- 모든 대리 PK는 `INTEGER PRIMARY KEY AUTOINCREMENT`. (`user_settings.user_id`는 users.id PK)
- 시각은 UTC ISO-8601 문자열(`YYYY-MM-DDTHH:MM:SS.sssZ`).
- 소프트 삭제 없음. 자식은 `ON DELETE CASCADE`. 메시지 `post_id`만 `SET NULL`.
- 팔로우·좋아요·저장·해시태그 매핑·캐러셀 순서는 UNIQUE.
- 자기 팔로우·자기 메시지·자기 알림은 CHECK로 거부.
- 미디어 바이너리는 넣지 않는다. `/uploads/...` 또는 시드 외부 URL.
- `username` / `email` / `hashtags.name` 은 `COLLATE NOCASE`.

SQLite PRAGMA:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

엔진: `check_same_thread=False`, `NullPool`. Postgres 없음. 스키마는 Alembic (`python migrate.py`, 서버 기동 시 upgrade). 로컬은 `instagram.db`, 서버는 `instagram.server.db` (`APP_ENV` 또는 `DATABASE_URL`). 데모 데이터를 다시 넣으려면 `python seed.py`.

---

## 2. ER 개요

```
users 1───1 user_settings
users 1───N posts
users 1───N comments
users 1───N likes
users 1───N saves
users 1───N stories
users 1───N notifications (recipient)
users 1───N notifications (actor)
users 1───N messages (sender / receiver)
users N───N users          (follows)
posts 1───N post_images
posts 1───N comments
posts 1───N likes
posts 1───N saves
posts N───N hashtags       (post_hashtags)
```

---

## 3. 테이블

### 3.1 `users`

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| username | VARCHAR(30) COLLATE NOCASE | UNIQUE NOT NULL, CHECK 3–30 | 소문자 저장 |
| email | VARCHAR(255) COLLATE NOCASE | UNIQUE NOT NULL | 소문자 저장 |
| hashed_password | VARCHAR(255) | NOT NULL | PBKDF2-SHA256 |
| full_name | VARCHAR(100) | NOT NULL DEFAULT '' | |
| bio | VARCHAR(150) | NOT NULL DEFAULT '' | 프론트 maxLength 150 |
| website | VARCHAR(255) | NOT NULL DEFAULT '' | |
| avatar_url | VARCHAR(500) | NULL | `/uploads/...` |
| is_private | BOOLEAN | NOT NULL DEFAULT 0 | 비공개 계정. 팔로우 요청 테이블 없음 |
| created_at | VARCHAR(40) | NOT NULL | |

인덱스: `username`, `email`.

### 3.2 `user_settings`

users와 1:1. 가입 시 1행.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| user_id | INTEGER | PK FK users.id CASCADE |
| show_activity | BOOLEAN | NOT NULL DEFAULT 1 (토글만, last_seen 없음) |
| suggest_account | BOOLEAN | NOT NULL DEFAULT 1 |
| language | VARCHAR(10) | NOT NULL DEFAULT 'ko', CHECK ko/en/ja/zh/es/fr |
| notify_likes | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_comments | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_follows | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_messages | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_stories | BOOLEAN | NOT NULL DEFAULT 1 (목록 type 아님) |

### 3.3 `posts`

커버 URL + 캡션. 슬라이드는 `post_images`. `image_url` = sort_order 0.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| user_id | INTEGER | FK users.id CASCADE NOT NULL |
| image_url | VARCHAR(500) | NOT NULL |
| caption | TEXT | NOT NULL DEFAULT '' |
| location | VARCHAR(100) | NOT NULL DEFAULT '' |
| created_at | VARCHAR(40) | NOT NULL |

인덱스: `user_id`, `created_at`.

### 3.4 `post_images`

프론트 만들기 화면 최대 10장.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| post_id | INTEGER | FK posts.id CASCADE NOT NULL |
| image_url | VARCHAR(500) | NOT NULL |
| sort_order | INTEGER | NOT NULL DEFAULT 0, CHECK 0–9 |

UNIQUE(`post_id`, `sort_order`). 인덱스: `post_id`.

### 3.5 `follows`

UNIQUE(`follower_id`, `following_id`). CHECK `follower_id != following_id`.  
컬럼: `id`, `follower_id`, `following_id`, `created_at`. 인덱스: 양쪽.

### 3.6 `likes`

UNIQUE(`user_id`, `post_id`). 인덱스: `post_id`.

### 3.7 `comments`

`content` VARCHAR(2200) NOT NULL, CHECK length 1–2200. 인덱스: (`post_id`, `created_at`).

### 3.8 `saves`

UNIQUE(`user_id`, `post_id`). 인덱스: (`user_id`, `created_at`) — 저장됨 탭.

### 3.9 `stories`

`expires_at = created_at + 24h`. 조회 `expires_at > now`. 인덱스: `user_id`, `expires_at`.

### 3.10 `notifications`

`type` CHECK `like` `comment` `follow` `message` (프론트 알림 문구와 동일).  
CHECK `user_id != actor_id`. follow/message 는 `post_id` NULL. 인덱스: (`user_id`, `created_at`).

### 3.11 `hashtags`

`name` VARCHAR(50) COLLATE NOCASE UNIQUE. CHECK 1–50자, `#` 없음. 소문자·유니코드.

정규식 (저장 시): `(?<!\w)#(\w{1,50})` `re.UNICODE`. 프론트: `#[\p{L}\p{N}_]+`.

### 3.12 `post_hashtags`

UNIQUE(`post_id`, `hashtag_id`). 인덱스: `hashtag_id` (태그 페이지).

### 3.13 `messages`

1:1. CHECK `sender_id != receiver_id`. CHECK `length(content) > 0 OR post_id IS NOT NULL`.  
`post_id` FK posts SET NULL. 인덱스: `receiver_id`, (`sender_id`, `receiver_id`, `created_at`).

---

## 4. 파생 값 (저장하지 않음)

| 값 | 계산 |
|---|---|
| posts_count | `COUNT(posts)` |
| followers_count | `COUNT(follows WHERE following_id = user)` |
| following_count | `COUNT(follows WHERE follower_id = user)` |
| like_count | `COUNT(likes WHERE post_id = post)` |
| comment_count | `COUNT(comments WHERE post_id = post)` |
| liked_by_me / saved_by_me / is_following / is_me | 현재 유저 기준 존재 여부 |
| unread_count | 알림 / DM |

`is_followed_by`, `@멘션` 테이블, `last_seen_at` 은 프론트 미사용이라 두지 않는다.

---

## 5. 시드

`backend/seed.py`. 기존 DB를 덮어쓴다.

| username | 비밀번호 | 비고 |
|---|---|---|
| demo | demo1234 | 공개 |
| test | 12345 (email `test@gmail.com`) | 공개 |
| plant_jun | pass1234 | **비공개** |
| travel_mia, foodie_ken, studio_ara, nightowl | pass1234 | 공개 |

계정당 게시 3+, 캐러셀, 팔로우, 좋아요, 댓글, 스토리, DM(텍스트+게시물 공유), 알림, `user_settings` 전원 1행. 이미지는 `uploads/seed/`.
