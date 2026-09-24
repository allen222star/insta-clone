import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _normalize_env(value: str) -> str:
    raw = (value or "").strip().lower()
    if raw in {"server", "prod", "production", "staging"}:
        return "server"
    return "local"


def _detect_app_env() -> str:
    explicit = os.getenv("APP_ENV") or os.getenv("ENV")
    if explicit:
        return _normalize_env(explicit)
    if os.getenv("EC2_HOME") or os.getenv("AWS_EXECUTION_ENV"):
        return "server"
    if Path("/home/ec2-user").exists() or os.getenv("USER") == "ec2-user":
        return "server"
    return "local"


APP_ENV = _detect_app_env()
load_dotenv(BASE_DIR / f".env.{APP_ENV}", override=True)
APP_ENV = _detect_app_env()

_DB_FILES = {
    "local": BASE_DIR / "instagram.db",
    "server": BASE_DIR / "instagram.server.db",
}
DB_PATH = _DB_FILES[APP_ENV]
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DB_PATH.as_posix()}"
if DATABASE_URL.startswith("sqlite:///"):
    DB_PATH = Path(DATABASE_URL.split("sqlite:///", 1)[1])

SECRET_KEY = os.getenv("SECRET_KEY", "dev-andygram-clone-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
