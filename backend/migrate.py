"""Apply backend/app/models.py schema to instagram.db.

SQLite cannot change COLLATE / CHECK / some UNIQUE constraints in place,
so a mismatched database is rebuilt and existing rows are copied.
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app import models  # noqa: F401, E402

DB_PATH = ROOT / "instagram.db"
NEXT_PATH = ROOT / "instagram.db.next"

REQUIRED_TABLES = (
    "users",
    "user_settings",
    "posts",
    "post_images",
    "follows",
    "likes",
    "comments",
    "saves",
    "stories",
    "notifications",
    "hashtags",
    "post_hashtags",
    "messages",
)

SCHEMA_MARKERS = (
    ("users", 'COLLATE "NOCASE"'),
    ("users", "ck_users_username_len"),
    ("users", "is_admin"),
    ("user_settings", "ck_user_settings_language"),
    ("post_images", "uq_post_images_order"),
    ("post_images", "ck_post_images_order"),
    ("comments", "ck_comments_content"),
    ("notifications", "ck_notifications_no_self"),
    ("hashtags", "ck_hashtags_name"),
    ("hashtags", 'COLLATE "NOCASE"'),
    ("messages", "ck_messages_body"),
)

REQUIRED_INDEXES = (
    "ix_post_hashtags_hashtag_id",
    "ix_saves_user_created",
    "ix_messages_thread",
    "ix_comments_post_created",
    "ix_notifications_user_created",
)


def _pragma(dbapi_connection, _record=None):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


def _connect(path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(path)
    con.execute("PRAGMA foreign_keys=ON")
    con.row_factory = sqlite3.Row
    return con


def _sql_map(con: sqlite3.Connection) -> dict[str, str]:
    rows = con.execute(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    return {name: sql or "" for name, sql in rows}


def _index_names(con: sqlite3.Connection) -> set[str]:
    rows = con.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    )
    return {name for (name,) in rows}


def schema_current(path: Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    con = _connect(path)
    try:
        tables = _sql_map(con)
        if any(name not in tables for name in REQUIRED_TABLES):
            return False
        for table, marker in SCHEMA_MARKERS:
            if marker not in tables.get(table, ""):
                return False
        indexes = _index_names(con)
        if any(name not in indexes for name in REQUIRED_INDEXES):
            return False
        return True
    finally:
        con.close()


def _make_engine(path: Path):
    url = f"sqlite:///{path.as_posix()}"
    eng = create_engine(url, connect_args={"check_same_thread": False}, poolclass=NullPool)
    event.listen(eng, "connect", _pragma)
    return eng


def _remove_db_files(path: Path) -> None:
    for extra in (path, Path(str(path) + "-wal"), Path(str(path) + "-shm")):
        if extra.exists():
            extra.unlink()


def _copy_rows(src: Path, dst: Path) -> int:
    old = _connect(src)
    new = sqlite3.connect(dst)
    new.execute("PRAGMA foreign_keys=OFF")
    copied = 0
    try:
        for table in Base.metadata.sorted_tables:
            name = table.name
            old_cols = [row[1] for row in old.execute(f'PRAGMA table_info("{name}")')]
            new_cols = [row[1] for row in new.execute(f'PRAGMA table_info("{name}")')]
            common = [col for col in new_cols if col in old_cols]
            if not common or not old_cols:
                continue
            col_sql = ", ".join(f'"{c}"' for c in common)
            placeholders = ", ".join("?" for _ in common)
            rows = old.execute(f'SELECT {col_sql} FROM "{name}"').fetchall()
            if not rows:
                continue
            new.executemany(
                f'INSERT INTO "{name}" ({col_sql}) VALUES ({placeholders})',
                [tuple(row[c] for c in common) for row in rows],
            )
            copied += len(rows)
        seq = old.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'"
        ).fetchone()
        if seq:
            new.execute("DELETE FROM sqlite_sequence")
            for row in old.execute("SELECT name, seq FROM sqlite_sequence"):
                new.execute("INSERT INTO sqlite_sequence(name, seq) VALUES (?, ?)", tuple(row))
        new.commit()
    finally:
        old.close()
        new.close()
    return copied


def migrate() -> str:
    engine.dispose()
    if schema_current(DB_PATH):
        con = _connect(DB_PATH)
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("PRAGMA foreign_keys=ON")
        con.close()
        from app.bootstrap import ensure_admin

        ensure_admin()
        return "already-current"

    _remove_db_files(NEXT_PATH)
    new_engine = _make_engine(NEXT_PATH)
    try:
        Base.metadata.create_all(bind=new_engine)
    finally:
        new_engine.dispose()

    copied = 0
    had_data = DB_PATH.exists() and DB_PATH.stat().st_size > 0
    if had_data:
        copied = _copy_rows(DB_PATH, NEXT_PATH)

    engine.dispose()
    _remove_db_files(DB_PATH)
    NEXT_PATH.replace(DB_PATH)
    for extra in (Path(str(NEXT_PATH) + "-wal"), Path(str(NEXT_PATH) + "-shm")):
        if extra.exists():
            extra.unlink()

    con = _connect(DB_PATH)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    err = con.execute("PRAGMA integrity_check").fetchone()[0]
    fk = con.execute("PRAGMA foreign_key_check").fetchall()
    con.close()
    if err != "ok":
        raise RuntimeError(f"integrity_check failed: {err}")
    if fk:
        raise RuntimeError(f"foreign_key_check failed: {fk}")
    from app.bootstrap import ensure_admin

    ensure_admin()
    return f"rebuilt rows={copied}"


if __name__ == "__main__":
    result = migrate()
    print(f"migration {result}: {DB_PATH}")
