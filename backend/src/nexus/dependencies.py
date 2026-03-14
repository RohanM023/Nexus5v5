"""Shared dependency injection providers for FastAPI."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from arq.connections import ArqRedis, create_pool
from clickhouse_connect.driver.client import Client
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.shared.clickhouse import get_clickhouse_client
from nexus.shared.database import get_db_session
from nexus.shared.redis import get_redis

_arq_pool: ArqRedis | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a SQLAlchemy async session."""
    async for session in get_db_session():
        yield session


async def get_redis_client() -> aioredis.Redis:
    """Return the shared Redis connection."""
    return await get_redis()


def get_ch_client() -> Client:
    """Return the shared ClickHouse client."""
    return get_clickhouse_client()


async def get_arq_pool() -> ArqRedis:
    """Return the shared arq Redis pool for enqueuing jobs."""
    global _arq_pool
    if _arq_pool is None:
        from nexus.worker import _get_redis_settings

        _arq_pool = await create_pool(_get_redis_settings())
    return _arq_pool


async def close_arq_pool() -> None:
    """Close the arq Redis pool."""
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.aclose()
        _arq_pool = None
