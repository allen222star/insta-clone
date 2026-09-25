# 프론트엔드 명세서

**프로젝트:** ANNAgram 클론  
**스택:** React 18 · Vite · React Router 6 · Axios  
**루트:** `frontend/`  
**개발 서버:** `http://localhost:5173`  
**API:** `import.meta.env.VITE_API_URL` 기본 `http://localhost:8000`

백엔드 JSON 계약은 `backend.md`를 따른다. UI는 2022년 이후 ANNAgram 웹(왼쪽 사이드바 + 중앙 피드 + 오른쪽 추천)을 기준으로 한다.

---

## 1. 목표 UX

로그인하지 않은 사용자는 홈 피드·탐색·릴스·프로필·게시물 상세를 볼 수 있다.  
글 작성, 좋아요, 댓글, 저장, 팔로우, 메시지, 알림을 누르면 `/login`으로 이동한다.  
사이드바(데스크톱)와 상단/하단 탭(모바일)에 로그인 진입점이 있다.

로그인 후 데스크톱에서는:

- 왼쪽 고정 사이드바 (홈, 검색, 탐색, 릴스, 메시지, 알림, 만들기, 프로필, 더 보기)
- 가운데 콘텐츠 (최대 폭 약 630px 피드 / 탐색은 더 넓게)
- 홈에서만 오른쪽 추천 패널 (약 320px, 뷰포트 1160px 이상)

모바일(≤768px):

- 사이드바 숨김
- 상단 얇은 헤더 (로고 + 만들기 + 알림)
- 하단 탭: 홈 / 탐색 / 만들기 / 릴스 / 프로필

시각:

- 배경 `#ffffff`, 구분선 `#dbdbdb`, 텍스트 `#262626`, 서브 `#737373`
- 링크/강조 `#0095f6`
- 스토리 링: `#f09433 → #e6683c → #dc2743 → #cc2366 → #bc1888`
- 로고 서체: `Grand Hotel`
- 본문: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial`

ANNAgram 공식 로고 에셋은 사용하지 않는다. 카메라 마크 + "ANNAgram" 워드마크 SVG/폰트로 클론 UI를 구성한다.

---

## 2. 라우트

| 경로 | 페이지 | 인증 |
|---|---|---|
| `/login` | 로그인 | 게스트 전용 |
| `/signup` | 가입 | 게스트 전용 |
| `/` | 홈 피드 + 스토리 + 추천 | 게스트 가능. 작성/좋아요/댓글은 로그인 |
| `/explore` | 탐색 그리드 | 게스트 가능 |
| `/reels` | 최신 게시물을 세로 카드로 탐색 (이미지 릴스 대체) | 게스트 가능 |
| `/p/:id` | 게시물 상세 | 게스트 가능. 좋아요/댓글은 로그인 |
| `/:username` | 프로필 | 게스트 가능. 팔로우는 로그인 |
| `/direct` | DM 목록 | 필요 |
| `/direct/:username` | 1:1 채팅 | 필요 |
| `/notifications` | 알림 (모바일 전용 페이지, 데스크톱은 패널) | 필요 |
| `/create` | 게시물 작성 (모바일 페이지, 데스크톱은 모달) | 필요 |
| `/accounts/edit` | 프로필 편집 | 필요 |
| `/explore/tags/:name` | 해시태그 | 게스트 가능 |

없는 유저/게시물: "페이지를 사용할 수 없습니다" 빈 상태.

---

## 3. 전역 상태

`AuthContext`

- `user`, `loading`, `login`, `signup`, `logout`, `refreshMe`, `updateUser`
- 토큰: `localStorage.ig_token`
- Axios 인터셉터: Authorization 헤더. 401이면 토큰 삭제 후 `/login`

검색/알림/만들기/더보기는 레이아웃 로컬 state (오버레이).

---

## 4. 화면별 요구

### 4.1 로그인 / 가입

- 중앙 폰 목업 또는 심플 카드. 클론답게 심플 화이트 카드 + 하단 "계정이 없으신가요?"
- 로그인: username 또는 email + password
- 가입: email, full_name, username, password
- 가입 클라이언트 검증(제출 전, API 호출 전에 막음):
  - email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — 실패 시 "올바른 이메일 형식을 입력해주세요."
  - username: `/^[a-zA-Z0-9._]{3,30}$/` — 실패 시 "사용자 이름은 3~30자의 영문, 숫자, 마침표, 밑줄만 사용할 수 있습니다."
  - password 6자 이상 등 기존 조건을 만족해야 제출 버튼 활성화(`ready`)
- 데모 계정 힌트: `demo` / `demo1234`
- 에러는 카드 하단에 빨간색으로

### 4.2 홈

- 스토리 가로 스크롤. 내 스토리가 없으면 아바타에 `+`
- 피드 카드:
  - 헤더: 아바타, username, 상대시간, 위치, 더보기(내 글이면 삭제)
  - 이미지 더블클릭 → 좋아요 + 중앙 하트 애니메이션
  - 액션: 좋아요, 댓글(상세 이동 또는 포커스), 공유(DM + 링크 복사), 저장
  - 좋아요 수 클릭 시 좋아요한 사람 목록
  - 내 글 더보기에서 캡션 수정 / 삭제
  - 여러 장이면 캐러셀
  - 좋아요 수, 캡션(더보기), 댓글 n개 보기, 댓글 입력
- 오른쪽: 내 계정, 회원님을 위한 추천, 팔로우 버튼
- 피드가 폴백이면 작은 안내: "아직 팔로우한 사람이 없어 탐색 게시물을 보여줍니다"

### 4.3 탐색

- 3열 정사각 그리드. 호버 시 좋아요/댓글 수
- 클릭 시 게시물 모달(데스크톱) 또는 `/p/:id`(모바일)

### 4.4 검색 패널

사이드바 검색 클릭 시 왼쪽에서 패널. 디바운스 250ms. 유저 리스트. 클릭 시 프로필.

### 4.5 알림 패널

좋아요 / 댓글 / 팔로우 / 메시지. 썸네일 클릭 시 게시물. 유저명 클릭 시 프로필. 열 때 읽음 처리.

### 4.6 만들기

- 이미지 드래그/선택(여러 장, 캐러셀) → 미리보기 → 캡션/위치 → 공유
- 성공 시 홈으로, 새 글이 피드 상단에 보이도록 refresh

### 4.7 프로필

- 아바타, 이름, 게시/팔로워/팔로잉 수 (클릭 시 리스트 모달)
- 나라면 프로필 편집, 남이면 팔로우/언팔로우 + 메시지
- 탭: 게시물 그리드, 저장됨(본인만)
- 빈 그리드 안내

### 4.8 게시물 상세 / 모달

ANNAgram 웹처럼 왼쪽 이미지, 오른쪽 댓글.  
댓글 작성/삭제, 좋아요, 저장, 작성자면 삭제.

### 4.9 스토리 뷰어

전체 화면 어두운 오버레이. 유저 그룹 단위. 클릭 좌/우 또는 진행 바. 내 스토리면 삭제.

### 4.10 DM

좌측 대화 목록, 우측 말풍선. 엔터로 전송. 비어 있으면 "친구에게 메시지 보내기".

### 4.11 릴스

최신 게시물을 한 장씩 크게. 좋아요/댓글/저장. 완전한 동영상 릴스가 아니라 이미지 기반 대체 화면임을 가이드에 명시.

---

## 5. 컴포넌트 구조

```
src/
  main.jsx
  App.jsx
  index.css
  api.js
  AuthContext.jsx
  utils.js
  components/
    Layout.jsx
    Sidebar.jsx
    BottomNav.jsx
    PostCard.jsx
    PostModal.jsx
    Feed.jsx
    StoriesBar.jsx
    StoryViewer.jsx
    Suggestions.jsx
    SearchPanel.jsx
    NotifPanel.jsx
    CreateModal.jsx
    UserListModal.jsx
    HeartIcon.jsx (및 기타 아이콘)
    Avatar.jsx
    TimeAgo.jsx
    Caption.jsx
  pages/
    Login.jsx
    Signup.jsx
    Home.jsx
    Explore.jsx
    Reels.jsx
    Profile.jsx
    EditProfile.jsx
    PostPage.jsx
    Direct.jsx
    NotificationsPage.jsx
    TagPage.jsx
    NotFound.jsx
```

---

## 6. API 클라이언트 (`api.js`)

Axios instance `baseURL = VITE_API_URL`.  
이미지 표시 헬퍼 `mediaUrl(path)`.

함수 목록은 백엔드 엔드포인트와 1:1:

`signup, login, me, updateMe, getUser, getUserPosts, follow, unfollow, suggested, searchUsers, getFollowers, getFollowing, feed, explore, getPost, createPost, deletePost, like, unlike, save, unsave, getSaved, getComments, addComment, deleteComment, getStories, createStory, deleteStory, getNotifications, readNotifications, unreadNotifCount, conversations, thread, sendMessage, unreadMsgCount, postsByTag`

---

## 7. 접근성 / 품질

- 아이콘 버튼은 `aria-label`
- 모달은 Esc로 닫힘, 배경 클릭으로 닫힘
- 이미지 `object-fit: cover`
- 좋아요 토글은 낙관적 업데이트 후 실패 시 롤백
- 한국어 UI 카피 (버튼, 빈 상태, 에러)

---

## 8. 완료 기준

- [ ] 데모 계정으로 로그인 후 피드가 보인다
- [ ] 게시/좋아요/댓글/팔로우/저장/스토리/알림/DM/프로필 편집이 동작한다
- [ ] 데스크톱 사이드바 + 모바일 하단 탭
- [ ] 브라우저에서 주요 흐름을 직접 확인한다
