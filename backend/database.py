import os
import shutil
import sqlite3
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from backend.config import get_settings

settings = get_settings()

Base = declarative_base()


def _is_sqlite(url) -> bool:
    return url.drivername.startswith("sqlite")


def _sqlite_path(url) -> Optional[str]:
    if not _is_sqlite(url):
        return None
    database = url.database or ""
    if database in (":memory:", ""):
        return None
    if os.path.isabs(database):
        return database
    base_dir = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(base_dir, database))


def _check_sqlite(path: str) -> bool:
    try:
        conn = sqlite3.connect(path)
        conn.execute("SELECT 1")
        conn.close()
        return True
    except Exception:
        return False


def _restore_from_backup(primary_path: str, backup_path: str) -> bool:
    if not primary_path or not backup_path:
        return False
    if not os.path.exists(backup_path):
        return False
    os.makedirs(os.path.dirname(primary_path), exist_ok=True)
    shutil.copyfile(backup_path, primary_path)
    return True


primary_url = make_url(settings.database_url)
backup_url = make_url(settings.backup_database_url)

connect_args = {"check_same_thread": False} if _is_sqlite(primary_url) else {}

primary_path = _sqlite_path(primary_url)
backup_path = _sqlite_path(backup_url)

use_backup = False
if primary_path:
    if not os.path.exists(primary_path) or not _check_sqlite(primary_path):
        restored = _restore_from_backup(primary_path, backup_path) if backup_path else False
        if restored and _check_sqlite(primary_path):
            use_backup = False
        elif backup_path and os.path.exists(backup_path):
            use_backup = True

engine = create_engine(
    str(backup_url) if use_backup else str(primary_url),
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

backup_engine = create_engine(str(backup_url), connect_args=connect_args)
BackupSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=backup_engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sync_backup_database() -> None:
    """Rewrite backup database with current primary data."""
    tables = list(Base.metadata.sorted_tables)
    if not tables:
        return

    with engine.begin() as source_conn, backup_engine.begin() as backup_conn:
        for table in reversed(tables):
            backup_conn.execute(table.delete())

        for table in tables:
            rows = source_conn.execute(table.select()).mappings().all()
            if rows:
                backup_conn.execute(table.insert(), [dict(row) for row in rows])


def _ensure_sqlite_columns(engine, table: str, columns: dict) -> None:
    """Ensure SQLite table has required columns; add any missing columns."""
    if engine.dialect.name != "sqlite":
        return
    try:
        with engine.begin() as conn:
            table_exists = conn.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table,),
            ).fetchone()
            if not table_exists:
                return

            existing = {
                row[1]
                for row in conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
            }
            for column_name, column_type in columns.items():
                if column_name in existing:
                    continue
                conn.exec_driver_sql(
                    f"ALTER TABLE {table} ADD COLUMN {column_name} {column_type}"
                )
    except Exception:
        # Best-effort migration; avoid failing app startup.
        return


def ensure_client_profile_columns() -> None:
    """Ensure id expiration fields exist on client_profiles in both databases."""
    required = {
        "id_expiration_date": "DATETIME",
        "id_document_url": "TEXT",
    }
    _ensure_sqlite_columns(engine, "client_profiles", required)
    _ensure_sqlite_columns(backup_engine, "client_profiles", required)
