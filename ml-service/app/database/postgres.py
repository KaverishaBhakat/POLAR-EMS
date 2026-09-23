"""
PostgreSQL database connection and station resolver using SQLAlchemy.
"""

import logging
from typing import Optional, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from app.config import settings

logger = logging.getLogger("polar_ems_ml.database")

_engine: Optional[Engine] = None


def sanitize_db_url(raw_url: str) -> str:
    """
    Sanitizes database URL for psycopg2 / SQLAlchemy compatibility.
    Removes unsupported query parameters such as pgbouncer, channel_binding, etc.
    """
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
    
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    parsed = urlsplit(url)
    query_params = parse_qsl(parsed.query)
    
    # Allowed libpq parameters for psycopg2
    allowed_params = {
        "sslmode", "connect_timeout", "application_name", "sslcert", 
        "sslkey", "sslrootcert", "sslcrl", "target_session_attrs", 
        "keepalives", "keepalives_idle", "keepalives_interval", "keepalives_count"
    }
    
    filtered_params = [(k, v) for k, v in query_params if k.lower() in allowed_params]
    new_query = urlencode(filtered_params)
    
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


def get_db_engine() -> Engine:
    """
    Get or initialize the SQLAlchemy database engine.
    Uses parameterized connection handling.
    """
    global _engine
    if _engine is None:
        if not settings.DATABASE_URL:
            raise ValueError(
                "DATABASE_URL is not set. Please configure DATABASE_URL in your .env or environment."
            )
        
        db_url = sanitize_db_url(settings.DATABASE_URL)

        _engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
        )
        logger.info("Database engine initialized successfully.")
    return _engine


def check_database_connection() -> Dict[str, Any]:
    """
    Check the database connectivity without exposing connection secrets.
    """
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            return {"connected": result == 1, "error": None}
    except Exception as e:
        logger.warning(f"Database connection check failed: {type(e).__name__}: {str(e)}")
        return {"connected": False, "error": f"{type(e).__name__}: Database unavailable"}


def resolve_station(station_identifier: str) -> Optional[Dict[str, Any]]:
    """
    Resolve a station by either its code (e.g. 'MAITRI', 'BHARATI') or its UUID.
    Returns a dictionary with station metadata if found, otherwise None.
    Uses parameterized SQL to prevent SQL injection.
    """
    engine = get_db_engine()
    query = text("""
        SELECT id, code, name, location, latitude, longitude, status
        FROM stations
        WHERE UPPER(code) = UPPER(:ident) OR id = :ident
        LIMIT 1
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"ident": station_identifier}).mappings().first()
        if result:
            return dict(result)
        return None
