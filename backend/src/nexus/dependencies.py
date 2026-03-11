"""Shared dependency injection providers for FastAPI."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from clickhouse_connect.driver.client import Client
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.shared.clickhouse import get_clickhouse_client
from nexus.shared.database import get_db_session
from nexus.shared.redis import get_redis


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
