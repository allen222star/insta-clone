from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from .config import CORS_ORIGINS, UPLOAD_DIR
from .database import init_db
from .bootstrap import ensure_admin
from .routers import admin, auth, messages, notifications, posts, settings, stories, users

init_db()
ensure_admin()

app = FastAPI(title="Instagram", version="1.0.0")
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
