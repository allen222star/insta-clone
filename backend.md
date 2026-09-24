# 백엔드 개발 요청 명세서

**프로젝트:** Instagram 클론  
**스택:** FastAPI · SQLAlchemy 2 · **SQLite 3 (개발·운영 동일)** · JWT · 로컬 파일 업로드  
**루트:** `backend/`  
**Base URL:** `http://localhost:8000`  
**API Prefix:** `/api`

이 문서는 **현재 프론트엔드 UI가 실제로 호출하는 계약**이다.  
SQLite 스키마는 **이 문서 §2.7** 과 `backend/app/models.py`가 기준이다. `db.md`는 같은 스키마를 따른다.  
여기에 없는 기능(OAuth, 이메일 인증, 비밀번호 찾기, 전화번호 로그인, 앱 스토어, 동영상 릴스, 라이브, 광고, 그룹채팅, Postgres/Redis, Alembic)은 구현하지 않는다.

응답 JSON 필드명을 바꾸지 않는다. 프론트 `frontend/src/api.js` 와 1:1이다.

---

## 0. 범위 (프론트 화면 기준)

`frontend/src/api.js`가 호출하는 경로만 구현한다. 아래 표에 없는 API는 만들지 않는다.

| 화면 | 호출 |
|---|---|
| 로그인 `/login` | `POST /api/auth/login` — username **또는 email**. 전화번호·페이스북·앱 다운로드 없음 |
| 가입 `/signup` | `POST /api/auth/signup` |
| 세션 | `GET /api/auth/me` (토큰 있으면). 로그아웃은 `localStorage`만, API 없음 |
| 홈 `/` | `GET /api/posts/feed`, `GET /api/stories`. 추천 `GET /api/users/suggested` (비로그인은 401을 프론트가 빈 목록으로 처리) |
| 탐색 `/explore` · 릴스 `/reels` | 둘 다 `GET /api/posts/explore` (릴스 전용·동영상 API 없음) |
| 해시태그 `/explore/tags/:name` | `GET /api/posts/tag/{name}` |
| 검색 패널 | `GET /api/users/search`, `GET /api/hashtags` |
| 게시 카드·모달·`/p/:id` | get, like/unlike, save/unsave, comments, add/delete comment, likes 목록, edit, delete |
| 만들기 `/create` | `POST /api/posts` (이미지 1–10, caption, location) |
| 공유 모달 | `GET /api/users/{me}/following` + `POST /api/messages/{username}` `{content:"", post_id}` |
| 프로필 `/:username` | get, posts, follow/unfollow, followers/following. 본인만 `GET /api/users/me/saved` |
| 프로필 수정 `/accounts/edit` | `PATCH /api/users/me` |
| 설정 알림·개인정보·언어 | `GET/PATCH /api/settings` |
| 설정 보안 `/accounts/password` | `POST /api/auth/password` |
| 설정 도움말 `/accounts/help` | **API 없음** |
| 알림 패널·`/notifications` | list, read, unread-count |
| 사이드바 배지 | `GET /api/notifications/unread-count`, `GET /api/messages/unread-count` |
| 메시지 `/direct/:username` | conversations, thread, send |
| 스토리 바 | list, create, 내 스토리 delete |

좋아요·댓글·저장·팔로우·만들기·메시지·알림·설정은 **로그인 필수**. 게스트가 누르면 프론트가 `/login`으로 보낸다.

---

## 1. 실행 환경 (개발 = 운영 = SQLite)

```
Python 3.11+
pip install -r requirements.txt
python migrate.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

개발만 `--reload`를 붙인다. 운영은 reload 없이 같은 SQLite 파일을 쓴다.

`.env`는 `python-dotenv`로 로드한다(`config.py`에서 `load_dotenv()`).

환경 변수 (`.env`):

| 키 | 개발 기본값 | 운영 |
|---|---|---|
| SECRET_KEY | 고정 개발 문자열 | **반드시 교체** |
| ACCESS_TOKEN_EXPIRE_MINUTES | 10080 (7일) | 동일 가능 |
| DATABASE_URL | `sqlite:///./instagram.db` | `sqlite:////절대경로/instagram.db` |
| CORS_ORIGINS | `http://localhost:5173,http://127.0.0.1:5173` | 실제 프론트 origin |

SQLite 연결 시:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

- 엔진: `connect_args={"check_same_thread": False}`, SQLite는 `NullPool`.
- 스키마: `models.py`가 기준. 적용은 `python migrate.py` (데이터 유지). Alembic/Postgres는 쓰지 않는다.
- 백업: DB 파일 + `uploads/` 디렉터리를 같이 복사한다.
- 빈 DB 첫 실행: `python seed.py`. 이후 스키마 변경은 `python migrate.py`. 시드를 다시 넣으려면 서버를 끄고 `python seed.py`.

업로드: `backend/uploads/` 를 `/uploads`로 마운트. 최대 10MB. MIME `image/jpeg|png|webp|gif`만. Pillow 변환은 필수가 아니다(원본 저장).

---

## 2. 공통 규칙

### 2.1 인증

- 헤더: `Authorization: Bearer <access_token>`
- JWT HS256, payload `{ "sub": "<user_id>", "username": "<username>" }`
- 비밀번호: PBKDF2-HMAC-SHA256 (`salt$hex`)
- 로그인 식별자: **username 또는 email** (소문자 비교). 전화번호 로그인은 없다.

**인증 없음:** `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/health`, `GET /uploads/*`

**선택 인증:** 토큰이 있으면 현재 유저, 없으면 게스트.

- `GET /api/posts/feed` `explore` `tag/{name}` `{id}` `{id}/comments` `{id}/likes`
- `GET /api/hashtags`
- `GET /api/users/search` `{username}` `{username}/posts` `{username}/followers` `{username}/following`
- `GET /api/stories`

**로그인 필수:** 그 외 전부 (`/me`, suggested, saved, PATCH/POST/DELETE 쓰기, 알림, DM, 설정, 비밀번호).

실패: `401 {"detail": "로그인이 필요합니다."}`

### 2.2 에러

`{"detail": "한국어 메시지"}`

| 상황 | 코드 |
|---|---|
| 잘못된 입력 | 400 또는 422 |
| 로그인 실패 | 401 |
| 이전 비밀번호 불일치 | 400 |
| 권한 없음 | 403 |
| 없음 | 404 |
| 중복 가입 / 자기 팔로우 | 409 |

### 2.3 페이지네이션 · 배열

쿼리 `limit`(기본 12, 최대 50), `offset`(기본 0). 홈 피드는 `limit=8`, 댓글·스레드는 `limit=100`을 보낸다.

**배열 그대로** (`r.data`가 리스트): `GET /api/users/suggested`, `GET /api/stories`, `GET /api/notifications`, `GET /api/messages/conversations`

**`{ items }`만** (limit/offset 없음): `followers`, `following`, `likes`, `hashtags`

**페이지 래퍼** (`items`, `limit`, `offset`, `has_more`): search, `{username}/posts`, `me/saved`, feed(+ `fallback`), explore, tag, comments, messages thread

```json
{ "items": [], "limit": 12, "offset": 0, "has_more": true }
```

### 2.4 시간

모든 `*_at` 는 UTC ISO-8601. 상대시간은 프론트.

### 2.5 해시태그

캡션에서 `(?<!\w)#(\w{1,50})` (`re.UNICODE`). 한국어 `#일상` 포함. 소문자 저장. `hashtags` + `post_hashtags`.

### 2.6 비공개 계정

`users.is_private = 1` 이면 본인·팔로워가 아닌 요청에 `GET .../posts` 는 빈 `items`. 프로필 메타는 공개.  
팔로우 요청 테이블은 없다. 프론트에 승인 대기 UI가 없다.

### 2.7 데이터베이스 스키마 (SQLite)

파일: `backend/instagram.db`. PK는 `INTEGER PRIMARY KEY AUTOINCREMENT`. 시각은 UTC ISO-8601 문자열. 미디어 바이너리는 넣지 않고 `/uploads/...` 경로만 저장한다.

`username`·`email`·`hashtags.name` 은 `COLLATE NOCASE` UNIQUE (로그인·검색이 소문자 비교). 애플리케이션은 소문자로 저장한다.

**저장하지 않는 값** (쿼리로 계산): `posts_count`, `followers_count`, `following_count`, `like_count`, `comment_count`, `liked_by_me`, `saved_by_me`, `is_following`, `is_me`, 알림/DM `unread_count`.  
프론트에 없는 값: `is_followed_by`, `last_seen_at`, `@멘션` 테이블. 캡션의 `@username` 은 문자열이며 프론트가 프로필 링크로 파싱한다.

**설정 토글만 있고 알림 행이 아닌 것:** `notify_stories`, `show_activity`. 알림 목록 문구는 `like` `comment` `follow` `message` 네 가지만 있다.

#### ER

```
users 1───1 user_settings
users 1───N posts / comments / likes / saves / stories
users 1───N notifications (recipient, actor)
users 1───N messages (sender, receiver)
users N───N users (follows)
posts 1───N post_images / comments / likes / saves
posts N───N hashtags (post_hashtags)
```

#### `users`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| username | VARCHAR(30) COLLATE NOCASE | UNIQUE NOT NULL, CHECK length 3–30 |
| email | VARCHAR(255) COLLATE NOCASE | UNIQUE NOT NULL |
| hashed_password | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(100) | NOT NULL DEFAULT '' |
| bio | VARCHAR(150) | NOT NULL DEFAULT '' (프론트 maxLength 150) |
| website | VARCHAR(255) | NOT NULL DEFAULT '' |
| avatar_url | VARCHAR(500) | NULL |
| is_private | BOOLEAN | NOT NULL DEFAULT 0 |
| created_at | VARCHAR(40) | NOT NULL |

인덱스: `username`, `email`.

#### `user_settings` (가입 시 1행, users 1:1)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| user_id | INTEGER | PK FK users.id CASCADE |
| show_activity | BOOLEAN | NOT NULL DEFAULT 1 |
| suggest_account | BOOLEAN | NOT NULL DEFAULT 1 |
| language | VARCHAR(10) | NOT NULL DEFAULT 'ko', CHECK `ko/en/ja/zh/es/fr` |
| notify_likes | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_comments | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_follows | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_messages | BOOLEAN | NOT NULL DEFAULT 1 |
| notify_stories | BOOLEAN | NOT NULL DEFAULT 1 |

#### `posts`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| user_id | INTEGER | FK users.id CASCADE NOT NULL |
| image_url | VARCHAR(500) | NOT NULL (첫 장, `post_images.sort_order=0`과 동일) |
| caption | TEXT | NOT NULL DEFAULT '' |
| location | VARCHAR(100) | NOT NULL DEFAULT '' |
| created_at | VARCHAR(40) | NOT NULL |

인덱스: `user_id`, `created_at`.

#### `post_images` (캐러셀, 프론트 최대 10장 → sort_order 0–9)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| post_id | INTEGER | FK posts.id CASCADE NOT NULL |
| image_url | VARCHAR(500) | NOT NULL |
| sort_order | INTEGER | NOT NULL DEFAULT 0, CHECK 0–9 |

UNIQUE(`post_id`, `sort_order`). 인덱스: `post_id`.

#### `follows`

UNIQUE(`follower_id`, `following_id`). CHECK `follower_id != following_id`.  
컬럼: `id`, `follower_id`, `following_id`, `created_at`. FK users CASCADE. 인덱스: 양쪽 user id.

#### `likes` · `saves`

UNIQUE(`user_id`, `post_id`). FK users/posts CASCADE. `created_at` NOT NULL.  
likes 인덱스: `post_id`. saves 인덱스: (`user_id`, `created_at`) — 저장됨 탭.

#### `comments`

`content` VARCHAR(2200) NOT NULL, CHECK length 1–2200. 인덱스: (`post_id`, `created_at`).

#### `stories`

`image_url`, `created_at`, `expires_at` (`created_at + 24h`). 조회는 `expires_at > now`. 인덱스: `user_id`, `expires_at`.

#### `notifications`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INTEGER | PK |
| user_id | INTEGER | 수신자 FK CASCADE |
| actor_id | INTEGER | 행위자 FK CASCADE |
| type | VARCHAR(20) | CHECK `like/comment/follow/message` |
| post_id | INTEGER | FK posts CASCADE NULL (follow/message는 NULL) |
| is_read | BOOLEAN | NOT NULL DEFAULT 0 |
| created_at | VARCHAR(40) | NOT NULL |

CHECK `user_id != actor_id`. 인덱스: (`user_id`, `created_at`).

#### `hashtags` · `post_hashtags`

`hashtags.name` VARCHAR(50) COLLATE NOCASE UNIQUE, CHECK 1–50자·`#` 없음. 소문자·유니코드(`#일상`).  
`post_hashtags` UNIQUE(`post_id`, `hashtag_id`). 인덱스: `hashtag_id` (태그 페이지).

캡션 파싱: `(?<!\w)#(\w{1,50})` (`re.UNICODE`). 프론트 표시는 `#[\p{L}\p{N}_]+`.

#### `messages`

1:1. CHECK `sender_id != receiver_id`. CHECK `length(content) > 0 OR post_id IS NOT NULL`.  
`post_id` FK posts **SET NULL** (게시물 공유). 인덱스: `receiver_id`, (`sender_id`, `receiver_id`, `created_at`).

---

## 3. 응답 스키마 (프론트가 읽는 필드만)

### UserPublic

```json
{
  "id": 1,
  "username": "demo",
  "full_name": "데모 사용자",
  "bio": "",
  "website": "",
  "avatar_url": "/uploads/a.jpg",
  "posts_count": 4,
  "followers_count": 10,
  "following_count": 8,
  "is_following": false,
  "is_me": false,
  "is_private": false
}
```

카운트·`is_following`·`is_me`는 쿼리로 계산. DB에 저장하지 않는다.

### UserMe

UserPublic + `"email"`

### PostCard

```json
{
  "id": 1,
  "image_url": "/uploads/p.jpg",
  "images": ["/uploads/p.jpg", "/uploads/p2.jpg"],
  "caption": "hello #travel",
  "location": "Seoul",
  "created_at": "2026-09-20T06:00:00.000Z",
  "like_count": 3,
  "comment_count": 2,
  "liked_by_me": false,
  "saved_by_me": false,
  "user": { "id": 1, "username": "demo", "avatar_url": "...", "full_name": "..." }
}
```

`images` = `post_images.sort_order`. `image_url` = 첫 장.

### Comment

```json
{ "id": 1, "content": "nice!", "created_at": "...", "user": { "id": 2, "username": "travel_mia", "avatar_url": "..." } }
```

### StoryGroup

```json
{
  "user": { "id": 1, "username": "demo", "avatar_url": "..." },
  "items": [{ "id": 1, "image_url": "...", "created_at": "...", "expires_at": "..." }],
  "latest_at": "..."
}
```

만료(`expires_at > now`)만. 로그인 시 나와 팔로우만, 내 그룹 맨 앞. 게스트는 만료되지 않은 스토리 전부.

### Notification

```json
{
  "id": 1,
  "type": "like",
  "is_read": false,
  "created_at": "...",
  "actor": { "id": 2, "username": "foodie_ken", "avatar_url": "..." },
  "post": { "id": 9, "image_url": "..." }
}
```

`type`: `like` `comment` `follow` `message`. follow/message 는 `post: null`.  
자기 자신 행위는 알림을 만들지 않는다. 수신자 알림 토글이 꺼져 있으면 행을 만들지 않는다.

### Conversation

```json
{
  "user": { "id": 2, "username": "travel_mia", "avatar_url": "...", "full_name": "..." },
  "last_message": "안녕",
  "last_at": "...",
  "unread_count": 2
}
```

본문 없이 게시물만 보낸 경우 `last_message`는 `"게시물을 보냈습니다"`.

### Message

```json
{
  "id": 1,
  "sender_id": 1,
  "receiver_id": 2,
  "content": "안녕",
  "is_read": true,
  "created_at": "...",
  "post": { "id": 9, "image_url": "/uploads/p.jpg" }
}
```

텍스트만이면 `post`는 `null`.

### Settings

`users.is_private` + `user_settings` 한 행. 행이 없으면 토글 전부 true, `language`는 `"ko"`.

```json
{
  "is_private": false,
  "show_activity": true,
  "suggest_account": true,
  "language": "ko",
  "notifications": {
    "likes": true,
    "comments": true,
    "follows": true,
    "messages": true,
    "stories": true
  }
}
```

`language` 허용: `ko` `en` `ja` `zh` `es` `fr`. 화면 문구는 프론트가 한국어로 유지한다. 컬럼은 §2.7 `user_settings`.

---

## 4. 엔드포인트

`frontend/src/api.js`와 1:1. **이 목록 밖의 경로·쿼리(unread_only, 릴스, 로그아웃, 페이스북, 팔로우 요청, 스토리 조회수, conversations 테이블 CRUD)는 만들지 않는다.**

라우터 등록 순서: `users`는 `/suggested` `/search` `/me` `/me/saved` 를 `/{username}` 보다 앞. `messages`는 `/conversations` `/unread-count` 를 `/{username}` 보다 앞. `posts`는 `/feed` `/explore` `/tag/{name}` 을 `/{id}` 보다 앞.

| 프론트 | 경로 | DB |
|---|---|---|
| health (서버) | GET `/api/health` | 없음 |
| authApi.signup | POST `/api/auth/signup` | INSERT `users` + `user_settings` |
| authApi.login | POST `/api/auth/login` | SELECT `users` (username/email NOCASE) |
| authApi.me | GET `/api/auth/me` | `users` |
| authApi.changePassword | POST `/api/auth/password` | UPDATE `users.hashed_password` |
| userApi.suggested | GET `/api/users/suggested` | `users` `follows` `user_settings.suggest_account` |
| userApi.search | GET `/api/users/search` | `users` |
| userApi.get | GET `/api/users/{username}` | `users` + COUNT `posts`/`follows` |
| userApi.updateMe | PATCH `/api/users/me` | UPDATE `users` (avatar는 파일) |
| userApi.posts | GET `/api/users/{username}/posts` | `posts` `post_images` ; private면 빈 items |
| userApi.saved | GET `/api/users/me/saved` | `saves` JOIN `posts` ORDER BY `saves.created_at` DESC |
| userApi.followers / following | GET `.../followers` `.../following` | `follows` |
| userApi.follow / unfollow | POST/DELETE `.../follow` | `follows` ; follow 시 `notifications` type=follow |
| settingsApi.get/patch | GET/PATCH `/api/settings` | `users.is_private` + `user_settings` |
| postApi.feed | GET `/api/posts/feed` | `posts` + `follows` |
| postApi.explore | GET `/api/posts/explore` | `posts` 최신 |
| postApi.byTag | GET `/api/posts/tag/{name}` | `hashtags` + `post_hashtags` + `posts` |
| postApi.get | GET `/api/posts/{id}` | `posts` `post_images` |
| postApi.create | POST `/api/posts` | `posts` `post_images` `hashtags` `post_hashtags` |
| postApi.edit | PATCH `/api/posts/{id}` | UPDATE caption/location ; caption 변경 시 해시태그 재연결 |
| postApi.remove | DELETE `/api/posts/{id}` | DELETE `posts` (CASCADE) |
| postApi.likes | GET `/api/posts/{id}/likes` | `likes` → UserPublic |
| postApi.hashtags | GET `/api/hashtags` | `hashtags` + COUNT `post_hashtags` |
| postApi.like / unlike | POST/DELETE `.../like` | `likes` UNIQUE ; like 시 알림 |
| postApi.save / unsave | POST/DELETE `.../save` | `saves` UNIQUE |
| postApi.comments | GET `.../comments` | `comments` 오래된 순 |
| postApi.addComment | POST `.../comments` | INSERT `comments` ; 알림 comment |
| postApi.deleteComment | DELETE `/api/comments/{id}` | DELETE `comments` |
| storyApi.list | GET `/api/stories` | `stories` `expires_at > now` |
| storyApi.create | POST `/api/stories` | INSERT `stories` expires=+24h |
| storyApi.remove | DELETE `/api/stories/{id}` | DELETE `stories` |
| notifApi.list | GET `/api/notifications` | `notifications` 배열 |
| notifApi.read | POST `/api/notifications/read` | UPDATE `is_read=1` |
| notifApi.unread | GET `/api/notifications/unread-count` | COUNT `is_read=0` |
| msgApi.conversations | GET `/api/messages/conversations` | `messages`에서 파생 (테이블 없음) |
| msgApi.unread | GET `/api/messages/unread-count` | COUNT receiver+미읽음 |
| msgApi.thread | GET `/api/messages/{username}` | `messages` 1:1 ; 상대→나 `is_read=1` |
| msgApi.send | POST `/api/messages/{username}` | INSERT `messages` ; 알림 message |

### Health

`GET /api/health` → `{ "ok": true }`  
프론트 `api.js`는 호출하지 않는다. 프로세스 확인용만.

### Auth

**POST `/api/auth/signup`**  
JSON `{ "email", "username", "password", "full_name" }`  
username 3–30, `^[a-zA-Z0-9._]+$`, 소문자 저장. password **가입 시** 6자 이상. email 소문자.  
INSERT `users` 후 **반드시** `user_settings` 기본행 1개 (토글 1, `language='ko'`).  
201 `{ "access_token", "token_type": "bearer", "user": UserMe }`  
중복 username/email 409.

**POST `/api/auth/login`**  
JSON `{ "username", "password" }`. 값은 username 또는 email (NOCASE). 전화번호 매칭 없음.  
200 형태는 signup과 동일. 실패 401 `"사용자 이름 또는 비밀번호가 올바르지 않습니다."`  
시드 비밀번호 길이는 검사하지 않는다. (`test@gmail.com` / `12345`, `demo` / `demo1234`)

**GET `/api/auth/me`** → UserMe (`users` + 파생 카운트)

**POST `/api/auth/password`**  
JSON `{ "old_password", "new_password" }`. 프론트 확인용 `confirm`은 보내지 않는다.  
새 비밀번호 6자+. 이전 불일치 400 `"이전 비밀번호가 올바르지 않습니다."` → `{ "ok": true }`

### Users

정적 경로를 `/{username}`보다 먼저 둔다.

**GET `/api/users/suggested?limit=5`**  
로그인 필수. **배열** `[UserPublic]` (래퍼 없음). `users.id != me` 이고 `follows`에 없는 행, 팔로워 수 DESC. `user_settings.suggest_account=0` 이면 제외.

**GET `/api/users/search?q=`**  
`users.username` / `full_name` LIKE. 빈 q → `{ "items": [] }`. 아니면 페이지 래퍼.

**GET `/api/users/{username}`** → UserPublic. 카운트는 `posts`/`follows` COUNT. `is_following`은 `follows` 존재. 비공개여도 메타는 공개.

**PATCH `/api/users/me`**  
`multipart/form-data`: `full_name` VARCHAR(100), `bio` VARCHAR(150), `website` VARCHAR(255), `avatar` 파일.  
`is_private` 필드는 **무시** (설정 API만). → UserMe

**GET `/api/users/{username}/posts`**  
PostCard 페이지네이션, `posts.created_at` DESC.  
`users.is_private=1` 이고 요청자가 본인·팔로워가 아니면 `items: []` (잠금 UI).

**GET `/api/users/me/saved`**  
`saves` WHERE user_id=me ORDER BY `saves.created_at` DESC → PostCard 페이지네이션.

**GET `/api/users/{username}/followers`** · **`/following`**  
`{ "items": [UserPublic] }` 만. (`follows.following_id` / `follower_id`)

**POST `/api/users/{username}/follow`**  
INSERT `follows` (UNIQUE, CHECK 자기 자신 409). 이미 있으면 200. 상대 `notify_follows=1`이면 `notifications` type=`follow`, post_id NULL. → UserPublic

**DELETE `/api/users/{username}/follow`**  
해당 `follows` 행 삭제. 없어도 200. → UserPublic

### Settings

**GET `/api/settings`** → Settings. `users.is_private` + `user_settings`. 행 없으면 기본값으로 INSERT 후 반환.

**PATCH `/api/settings`** JSON 보낸 키만.

| JSON | 컬럼 |
|---|---|
| `is_private` | `users.is_private` |
| `show_activity` | `user_settings.show_activity` |
| `suggest_account` | `user_settings.suggest_account` |
| `language` | `user_settings.language` (`ko/en/ja/zh/es/fr`) |
| `notifications.likes` | `notify_likes` |
| `notifications.comments` | `notify_comments` |
| `notifications.follows` | `notify_follows` |
| `notifications.messages` | `notify_messages` |
| `notifications.stories` | `notify_stories` (저장만. 알림 `type`에 story 없음) |

프론트는 토글마다 부분 PATCH (`{ is_private }`, `{ notifications: { likes, comments, follows, messages, stories } }` 등).

### Posts

**GET `/api/posts/feed?limit=&offset=`**  
로그인: `posts.user_id IN (me ∪ following)`. 0건이면 전체 최신 + `fallback: true`.  
게스트: 전체 최신 + `fallback: true`. (비공개 필터는 프로필 그리드만 — 프론트 홈과 동일)

```json
{ "items": [], "limit": 8, "offset": 0, "has_more": false, "fallback": false }
```

**GET `/api/posts/explore`** `posts.created_at` DESC. 탐색·릴스 동일.

**GET `/api/posts/tag/{name}`** name 소문자, `#` 제거. `hashtags.name` JOIN `post_hashtags` — 캡션 LIKE 금지.

**GET `/api/posts/{id}`** PostCard. `images` = `post_images` ORDER BY `sort_order`. `image_url` = 첫 장 = `posts.image_url`.

**POST `/api/posts`**  
`multipart`: `images`(반복, 최대 10, sort_order 0–9) 그리고/또는 `image`, `caption`, `location`.  
INSERT `posts` (image_url=첫 장) + `post_images` + 캡션 해시태그 upsert. 201 PostCard.

**PATCH `/api/posts/{id}`** JSON `{ "caption", "location" }` 작성자만. caption 바뀌면 `post_hashtags` 삭제 후 재파싱. → PostCard

**DELETE `/api/posts/{id}`** 작성자만. 204. CASCADE로 images/likes/comments/saves/hashtag맵/관련 알림 삭제. `messages.post_id`는 SET NULL.

**GET `/api/posts/{id}/likes`** `{ "items": [UserPublic] }` (`likes`)

**GET `/api/hashtags?q=`** q에서 `#` 제거. 빈 q → `{ "items": [] }`.  
`{ "items": [{ "name", "posts_count" }] }` — `posts_count` = COUNT `post_hashtags`.

### Likes / Saves / Comments

**POST `/api/posts/{id}/like`** INSERT `likes` (이미 있으면 유지). `{ "liked": true, "like_count": n }`. 작성자≠나 이고 `notify_likes=1`이면 알림 `like`.  
**DELETE `/api/posts/{id}/like`** DELETE 행. `{ "liked": false, "like_count": n }`

**POST `/api/posts/{id}/save`** INSERT `saves`. `{ "saved": true }`  
**DELETE `/api/posts/{id}/save`** `{ "saved": false }`

**GET `/api/posts/{id}/comments`** `comments.created_at` 오름차순 페이지네이션.

**POST `/api/posts/{id}/comments`** JSON `{ "content" }` 1–2200. 201 Comment. 작성자≠나 이고 `notify_comments=1`이면 알림 `comment`.

**DELETE `/api/comments/{id}`** 댓글 작성자 또는 게시 작성자. 204.

### Stories

**GET `/api/stories`** StoryGroup **배열**. `expires_at > now`. 로그인: 나+팔로우, 내 그룹 맨 앞. 게스트: 만료되지 않은 전부.

**POST `/api/stories`** `multipart` `image`. `expires_at = created_at+24h`. 201 `{ id, image_url, created_at, expires_at }`. 알림 행을 만들지 않음.

**DELETE `/api/stories/{id}`** 작성자만. 204.

### Notifications

쿼리 `unread_only` / `limit` / `offset` **금지**. 프론트는 배열만 쓴다.

**GET `/api/notifications`** 최신순 배열. `user_id=me`. 현재 `user_settings.notify_*`가 꺼진 type은 목록에서 뺀다. (설정 문구: 꺼 둔 활동은 목록에 안 보임.) `notify_stories`는 매칭 type이 없어 무시.

**POST `/api/notifications/read`** 내 행 `is_read=1`. `{ "ok": true }`

**GET `/api/notifications/unread-count`** `{ "count": n }` — 미읽음 중 목록과 같은 type 필터.

알림 INSERT 시 `user_id != actor_id`, 수신자 토글이 꺼져 있으면 행을 만들지 않음.

### Messages

`conversations` 테이블 없음. 전부 `messages`.

**GET `/api/messages/conversations`** Conversation **배열**. 상대 = 나∉ (sender, receiver)의 다른 id. `last_at` 최신 1건. `content` 비고 `post_id`만 있으면 `last_message` = `"게시물을 보냈습니다"`. `unread_count` = 그 상대→나 AND `is_read=0`.

**GET `/api/messages/unread-count`** `{ "count": n }` — `receiver_id=me AND is_read=0`

**GET `/api/messages/{username}`**  
1:1 `created_at` 오름차순 페이지. 조회 시 상대→나 `is_read=1`. `{ items, limit, offset, has_more }`. `post`는 `messages.post_id` JOIN `posts.image_url` (없으면 null).

**POST `/api/messages/{username}`**  
JSON `{ "content", "post_id" }` 또는 `{ "content": "..." }`. CHECK: content 길이>0 또는 post_id. `post_id`는 존재하는 `posts.id`. 201 Message. `notify_messages=1`이면 알림 `message`.

---

## 5. 파일 URL

저장명 `{uuid4().hex}{ext}` → 응답 `/uploads/...`  
이미 `http`/`https`/`blob:` 이면 프론트가 그대로 표시 (시드 외부 URL 허용).

---

## 6. 모듈 구조

```
backend/
  app/
    main.py              # CORS, create_all, static, 라우터
    config.py            # SQLite DATABASE_URL, SECRET, CORS, UPLOAD_DIR
    database.py          # engine WAL, foreign_keys, Session
    models.py            # db.md 테이블 + UserSettings
    schemas.py           # 입력 모델만
    auth.py              # hash / jwt
    deps.py              # get_current_user, get_optional_user
    media.py             # 이미지 저장
    helpers.py           # UserPublic, PostCard, 해시태그
    notify.py            # 알림 insert (토글 존중)
    routers/
      auth.py
      users.py
      settings.py
      posts.py
      stories.py
      notifications.py
      messages.py
  seed.py
  migrate.py
  requirements.txt
  instagram.db           # SQLite 파일 (gitignore)
  uploads/
```

라우터 prefix는 위 경로와 동일하게 둔다. 사용하지 않는 리소스(OAuth, 전화번호, 앱링크) 모듈은 추가하지 않는다.

---

## 7. 시드

`python seed.py`가 SQLite 파일을 덮어쓴다. uvicorn이 파일을 잡고 있으면 실패하므로 서버를 끄고 실행한다. 모든 유저에 `user_settings` 1행을 만든다.

| 로그인 | 비밀번호 | 비고 |
|---|---|---|
| demo | demo1234 | 공개 |
| test@gmail.com | 12345 | username `test`, 공개 |
| plant_jun | pass1234 | **비공개 계정** |
| travel_mia, foodie_ken, studio_ara, nightowl | pass1234 | 공개 |

계정마다 게시물 3개 이상, 캐러셀 1개, 상호 팔로우, 좋아요/댓글/저장/스토리/DM(텍스트+게시물 공유)/알림. 해시태그는 한국어 포함.

---

## 8. 완료 기준

- [ ] `/docs`에 **이 문서의 엔드포인트만** 있다
- [ ] 게스트: 홈·탐색·릴스·프로필·게시물·검색이 열린다
- [ ] 로그인 후: 게시·캐러셀·좋아요·댓글·저장·팔로우·스토리·알림·DM·프로필 편집
- [ ] 설정: 알림 토글, 비공개 계정, 비밀번호 변경, 언어가 SQLite에 남는다
- [ ] 비공개 계정의 그리드는 비팔로워에게 비어 있다
- [ ] 페이스북 로그인·앱 다운로드 API가 없다
- [ ] 개발과 운영 모두 같은 SQLite 파일 형식이다 (`NullPool`, WAL, foreign_keys)
- [ ] username/email UNIQUE는 NOCASE 이다
- [ ] Vite origin에서 CORS로 호출된다
