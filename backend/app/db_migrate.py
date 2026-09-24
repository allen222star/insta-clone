from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from .config import DATABASE_URL

ROOT = Path(__file__).resolve().parent.parent
ALEMBIC_INI = ROOT / "alembic.ini"


def _alembic_config() -> Config:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))
    return cfg


def run_migrations() -> str:
    from .database import engine

    cfg = _alembic_config()
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "users" in tables and "alembic_version" not in tables:
        command.stamp(cfg, "head")
        return "stamped-existing"
    command.upgrade(cfg, "head")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return "upgraded"
