"""Apply Alembic migrations to the environment-selected SQLite file."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app.config import APP_ENV, DATABASE_URL, DB_PATH  # noqa: E402
from app.db_migrate import run_migrations  # noqa: E402


def migrate() -> str:
    return run_migrations()


if __name__ == "__main__":
    result = migrate()
    print(f"alembic {result}: env={APP_ENV} db={DB_PATH} url={DATABASE_URL}")
