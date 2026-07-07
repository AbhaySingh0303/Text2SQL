from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from app.core.config import get_settings

_engine_cache = {}

def clear_engine_cache():
    """Disposes and clears all cached SQLAlchemy engines."""
    global _engine_cache
    for url, engine in list(_engine_cache.items()):
        try:
            engine.dispose()
        except Exception:
            pass
    _engine_cache.clear()

def get_engine() -> Engine:
    """Retrieves or creates a database engine based on active settings."""
    settings = get_settings()
    db_url = settings.database_url
    if db_url not in _engine_cache:
        connect_args = {}
        if db_url.startswith("postgresql"):
            # Set connection timeout to 5 seconds for PostgreSQL
            connect_args = {"connect_timeout": 5}
        
        _engine_cache[db_url] = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args=connect_args
        )
    return _engine_cache[db_url]

@contextmanager
def get_db_session():
    """Context manager for SQLAlchemy ORM session lifecycle management."""
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@contextmanager
def get_db_connection():
    """Context manager for low-level connection operations."""
    engine = get_engine()
    connection = engine.connect()
    try:
        yield connection
    finally:
        connection.close()

def test_connection(db_url: str) -> bool:
    """Verifies database connectivity for a specific connection string."""
    try:
        connect_args = {}
        if db_url.startswith("postgresql"):
            connect_args = {"connect_timeout": 3}
        engine = create_engine(db_url, connect_args=connect_args)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
