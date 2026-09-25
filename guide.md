# ANNAgram 클론 — 전체 프로젝트 가이드

React(Vite) + FastAPI + SQLite로 ANNAgram 웹을 재현한 풀스택 클론입니다.  
학습·포트폴리오용이며 Meta/ANNAgram과 무관합니다.

관련 문서:

| 문서 | 내용 |
|---|---|
| [front.md](./front.md) | 화면, 라우트, 컴포넌트, UX |
| [backend.md](./backend.md) | API 계약, 인증, 모듈 |
| [db.md](./db.md) | 테이블, 인덱스, 피드 쿼리, 시드 |

---

## 1. 무엇을 구현했는가

| 기능 | 설명 |
|---|---|
| 가입 / 로그인 | JWT, username 또는 email 로그인 |
| 홈 피드 | 팔로우한 사람 + 내 게시물. 비면 탐색 폴백 |
| 스토리 | 이미지 스토리, 24시간 만료, 뷰어 |
| 게시 | 이미지 + 캡션 + 위치, 해시태그 |
| 좋아요 / 댓글 / 저장 | 더블클릭 좋아요, 낙관적 UI |
| 팔로우 | 추천 계정, 팔로워/팔로잉 목록 |
| 탐색 / 검색 | 그리드, 유저 검색, 해시태그 페이지 |
| 프로필 | 그리드, 편집, 아바타 |
| 알림 | 좋아요·댓글·팔로우·메시지 |
| DM | 1:1 텍스트 + 게시물 공유 |
| 캐러셀 | 게시물당 최대 10장 |
| 릴스 탭 | 이미지 기반 세로 탐색 (동영상 없음) |
| 반응형 | 사이드바 ↔ 하단 탭 |

의도적으로 빠진 것: 실제 동영상 릴스/라이브, 광고, 쇼핑, 알고리즘 랭킹, 그룹 채팅, 음성 메시지, OAuth(Facebook) 로그인.

---

## 2. 폴더

```
insta/
  package.json      npm run dev
  scripts/dev.mjs   설치 + API/UI + 브라우저
  start.bat         같은 실행 (더블클릭)
  front.md
  backend.md
  db.md
  guide.md
  backend/          FastAPI
  frontend/         Vite + React
```

---

## 3. 사전 요구

- Node.js 18+
- Python 3.11+
- 브라우저 (Chrome 권장)

Windows PowerShell 기준입니다.

---

## 4. 실행

프로젝트 루트 또는 `frontend` 폴더에서:

```powershell
npm run dev
```

패키지가 없으면 설치하고, FastAPI와 Vite를 띄운 뒤 브라우저(http://localhost:5173)를 엽니다.  
데모 계정: `demo` / `demo1234`  
테스트 계정: `test@gmail.com` / `12345` (사용자 이름 `test`)

종료: 그 터미널에서 `Ctrl+C`

확인:

- UI: http://localhost:5173
- API: http://localhost:8000/api/health
- Swagger: http://localhost:8000/docs

---

## 5. 수동 실행 (선택)

서버만 따로 띄울 때:

```powershell
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm run dev:ui
```

`frontend/.env` (선택):

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=true
```

---

## 6. 개발 흐름

1. UI/UX 변경 → `front.md`와 `frontend/src`를 함께 맞춘다
2. API 필드 변경 → `backend.md`를 먼저 고치고 프론트 `api.js` / 페이지를 맞춘다
3. 테이블 변경 → `db.md` → `models.py` → `alembic revision --autogenerate -m "..."` → `python migrate.py`. 데모를 처음부터 다시 넣으려면 서버를 끄고 `python seed.py`

인증 토큰은 `localStorage.ig_token`에 있습니다. 백엔드를 시드하면 기존 토큰의 user id가 어긋날 수 있으니 로그아웃 후 다시 로그인합니다.

---

## 7. 아키텍처

```
[React SPA] --JSON/JWT--> [FastAPI]
                              |
                              +-- SQLAlchemy --> SQLite (instagram.db)
                              +-- /uploads 정적 파일
```

이미지는 서버 디스크에 저장하고 URL만 DB에 둡니다.  
알림은 폴링(패널을 열 때 + 레이아웃에서 약 30초)으로 미읽음 뱃지를 갱신합니다. 웹소켓은 사용하지 않습니다.

---

## 8. 주요 화면 연결

1. `/signup` 또는 `/login`
2. `/` 스토리·피드·추천
3. 사이드바 **만들기** → 사진 업로드
4. 하트 / 더블클릭 / 댓글 / 북마크
5. `/:username` 팔로우 후 다시 홈
6. **메시지**로 DM
7. **탐색** 그리드, 검색 패널

---

## 9. 문제 해결

| 증상 | 조치 |
|---|---|
| 피드 이미지 깨짐 | 백엔드 8000이 켜져 있는지, `VITE_API_URL` 확인 |
| CORS 에러 | 프론트가 5173인지, 백엔드 CORS 설정 확인 |
| 로그인 401 | 시드 후 재로그인, 비밀번호 `demo1234` |
| 모듈 없음 | `pip install -r requirements.txt` / `npm install` |
| DB 잠김 | uvicorn 종료 후 `seed.py` 재실행 |
| PowerShell 실행 정책 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

---

## 10. 스크립트 요약

| 명령 | 역할 |
|---|---|
| `npm run dev` | 설치 확인 + API/UI + 브라우저 |
| `npm run install:all` | Python/Node 패키지 재설치 |
| `npm run dev:ui` (`frontend`) | Vite만 |
| `python seed.py` | 데모 유저·게시물 생성 (현재 `APP_ENV` DB) |
| `python migrate.py` | Alembic으로 현재 환경 SQLite 스키마 적용 |
| `npm run build` (`frontend`) | 프론트 프로덕션 빌드 |

프로덕션(`APP_ENV=server`)에서는 FastAPI가 `frontend/dist`와 `/api`·`/uploads`를 같이 서빙합니다.

---

## 11. 자동 배포

`main` 푸시 시 GitHub Actions가 OpenSSH로 `/var/www/insta-clone`에 접속한 뒤 `deploy.sh`를 실행합니다 (`git reset --hard origin/main`, `pip install`, `alembic upgrade`, Node 20으로 프론트 빌드, `pm2 restart`).

| Secret | 설명 |
|---|---|
| `SERVER_HOST` | EC2 호스트 |
| `SERVER_USER` | SSH 사용자 |
| `SERVER_SSH_KEY` | 배포용 SSH private key |

서버 앱 환경은 `backend/.env.server`에 `APP_ENV=server`와 `SECRET_KEY`를 둡니다. DB는 `instagram.server.db`입니다. PM2로 API를 띄워 두면 이후 푸시마다 재시작됩니다.

### Actions SSH 오류

로그에 `***`는 시크릿 값이 가려진 것입니다. 실제 호스트가 `***`인 게 아닙니다.

| 로그 | 원인 | 조치 |
|---|---|---|
| `ssh: no key found` | `SERVER_SSH_KEY`가 개인키가 아님 | **공개키(`.pub`)가 아니라** `-----BEGIN ... PRIVATE KEY-----` 전체. 따옴표·한 줄 압축 없이 줄바꿈 유지 |
| `lookup ... no such host` | `SERVER_HOST`를 DNS가 못 찾음 | EC2 **Public IPv4** 또는 `ec2-....compute.amazonaws.com`. `http://`, 포트, 슬래시 없이 |
| `Connection timed out` / `Connection refused` | 보안그룹이 Actions IP를 막음 | EC2 인바운드 22를 GitHub Actions에서 열거나, 테스트로 `0.0.0.0/0` 22 (임시) |
| `Permission denied (publickey)` | 서버가 그 개인키를 모름 | `ec2-user`의 `~/.ssh/authorized_keys`에 짝 공개키 추가 |

시크릿은 **Settings → Secrets and variables → Actions**에서 다시 저장한 뒤 워크플로를 재실행합니다. 키를 채팅에 붙여 넣지 마세요.
