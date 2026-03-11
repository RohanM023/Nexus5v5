"""Shared pytest fixtures for Nexus-5v5 backend tests."""

from __future__ import annotations

import asyncio
import os
import uuid
from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from nexus.shared.database import Base

# Use SQLite for tests (in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create an async SQLAlchemy engine for testing."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Import all models to register them with Base.metadata
    from nexus.identity.models import IdentityLink, RefreshToken, RiotAccount, User  # noqa: F401
    from nexus.draft.models import DraftSession, ScoreSnapshot, Team, TeamMember  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional DB session that rolls back after each test."""
    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def mock_redis():
    """Provide a mock Redis client."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.incr = AsyncMock(return_value=1)
    mock.expire = AsyncMock(return_value=True)
    mock.pipeline = MagicMock()
    pipe = AsyncMock()
    pipe.incr = MagicMock()
    pipe.expire = MagicMock()
    pipe.execute = AsyncMock(return_value=[1, True])
    mock.pipeline.return_value = pipe
    return mock


@pytest.fixture
def mock_riot_api():
    """Provide mock Riot API responses."""
    return {
        "account": {
            "puuid": "test-puuid-12345",
            "gameName": "TestPlayer",
            "tagLine": "NA1",
        },
        "summoner": {
            "id": "test-summoner-id",
            "puuid": "test-puuid-12345",
            "profileIconId": 5,
            "summonerLevel": 100,
        },
        "match_ids": [
            "NA1_5000000001",
            "NA1_5000000002",
            "NA1_5000000003",
        ],
        "match_detail": {
            "metadata": {
                "matchId": "NA1_5000000001",
                "participants": ["test-puuid-12345"],
            },
            "info": {
                "gameStartTimestamp": 1700000000000,
                "gameDuration": 1800,
                "gameVersion": "14.10.1",
                "queueId": 420,
                "teams": [
                    {"teamId": 100, "win": True},
                    {"teamId": 200, "win": False},
                ],
                "participants": [
                    {
                        "puuid": "test-puuid-12345",
                        "championId": 1,
                        "championName": "Annie",
                        "teamId": 100,
                        "teamPosition": "MIDDLE",
                        "kills": 10,
                        "deaths": 2,
                        "assists": 8,
                        "totalMinionsKilled": 180,
                        "neutralMinionsKilled": 20,
                        "goldEarned": 14000,
                        "totalDamageDealtToChampions": 25000,
                        "totalDamageTaken": 15000,
                        "visionScore": 30,
                    }
                ],
            },
        },
    }


@pytest.fixture
def mock_clickhouse():
    """Provide a mock ClickHouse client."""
    with patch("nexus.shared.clickhouse.get_clickhouse_client") as mock:
        client = MagicMock()
        client.query.return_value = MagicMock(column_names=[], result_rows=[])
        client.insert.return_value = None
        client.command.return_value = None
        mock.return_value = client
        yield client


@pytest.fixture
async def test_client(
    db_session: AsyncSession,
    mock_redis,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client with dependency overrides."""
    from nexus.shared.database import get_db_session
    from nexus.shared.redis import get_redis

    # Set env vars for test settings
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"
    os.environ["RIOT_API_KEY"] = "RGAPI-test-key"

    async def override_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    async def override_redis():
        return mock_redis

    from nexus.main import create_app

    app = create_app()
    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_redis] = override_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user_id() -> uuid.UUID:
    """A stable test user UUID."""
    return uuid.UUID("12345678-1234-5678-1234-567812345678")


@pytest.fixture
def auth_headers(test_user_id: uuid.UUID) -> dict[str, str]:
    """Create valid auth headers with a test JWT."""
    from nexus.middleware.auth import create_access_token

    os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"
    token = create_access_token(test_user_id)
    return {"Authorization": f"Bearer {token}"}
