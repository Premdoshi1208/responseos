import os
import sys
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text

from app.core.config import get_settings

settings = get_settings()

_url = settings.DATABASE_URL
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _url.startswith("postgresql://"):
    _url = _url.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg expects ssl=require rather than sslmode=require and does not support channel_binding query param
if "asyncpg" in _url:
    _url = _url.replace("sslmode=require", "ssl=require")
    _url = _url.replace("channel_binding=require&", "")
    _url = _url.replace("&channel_binding=require", "")
    _url = _url.replace("?channel_binding=require", "?")
    if _url.endswith("?"):
        _url = _url[:-1]

engine_kwargs = {
    "echo": (settings.ENVIRONMENT == "development"),
}

if "sqlite" in _url:
    # SQLite configuration for local dev / testing
    pass
elif os.getenv("TESTING") == "1" or "pytest" in sys.modules:
    from sqlalchemy.pool import NullPool
    engine_kwargs.update({
        "poolclass": NullPool,
    })
else:
    # PostgreSQL / Neon configuration
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })

engine = create_async_engine(_url, **engine_kwargs)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_db_health() -> bool:
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
