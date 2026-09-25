from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from .config import APP_ENV, BASE_DIR, CORS_ORIGINS, UPLOAD_DIR
from .database import init_db
from .bootstrap import ensure_admin
from .routers import admin, auth, messages, notifications, posts, settings, stories, users

init_db()
ensure_admin()

app = FastAPI(title="ANNAgram", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(stories.router)
app.include_router(notifications.router)
app.include_router(messages.router)
app.include_router(settings.router)
app.include_router(admin.router)


@app.exception_handler(RequestValidationError)
def validation_error(_request: Request, _exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "잘못된 입력입니다."})


@app.exception_handler(IntegrityError)
def integrity_error(_request: Request, _exc: IntegrityError):
    return JSONResponse(status_code=400, content={"detail": "잘못된 입력입니다."})


@app.get("/api/health")
def health():
    return {"ok": True}


DIST_DIR = BASE_DIR.parent / "frontend" / "dist"
if APP_ENV == "server" and DIST_DIR.is_dir():
    assets = DIST_DIR / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets)), name="frontend-assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = (DIST_DIR / full_path).resolve()
        if full_path and candidate.is_file() and DIST_DIR in candidate.parents:
            headers = {}
            name = candidate.name
            if name in {"sw.js", "registerSW.js", "manifest.webmanifest"} or name.startswith("workbox-"):
                headers["Cache-Control"] = "no-cache"
            return FileResponse(candidate, headers=headers)
        index = DIST_DIR / "index.html"
        if index.is_file():
            return FileResponse(index)
        return JSONResponse({"detail": "프론트 빌드가 없습니다."}, status_code=404)
