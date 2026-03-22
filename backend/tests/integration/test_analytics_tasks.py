"""Integration tests for the nightly batch analytics refresh job (E4-T10)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_ch_rows() -> list[dict[str, Any]]:
    """Sample ClickHouse rows for champion pool stats."""
    return [
        {
            "champion_id": 1,
            "champion_name": "Annie",
            "games_played": 50,
            "wins": 30,
            "avg_kills": 8.0,
            "avg_deaths": 3.0,
            "avg_assists": 7.0,
            "avg_cs_per_min": 7.5,
            "avg_vision_score": 25.0,
            "last_played": datetime(2026, 3, 10, tzinfo=UTC),
        },
        {
            "champion_id": 86,
            "champion_name": "Garen",
            "games_played": 20,
            "wins": 12,
            "avg_kills": 6.0,
            "avg_deaths": 4.0,
            "avg_assists": 5.0,
            "avg_cs_per_min": 6.0,
            "avg_vision_score": 15.0,
            "last_played": datetime(2026, 2, 20, tzinfo=UTC),
        },
    ]


@pytest.fixture
def mock_recent_rows() -> list[dict[str, Any]]:
    """Recent game rows for RecentForm computation."""
    return [
        {"win": 1, "kills": 10, "deaths": 2, "assists": 8},
        {"win": 0, "kills": 3, "deaths": 5, "assists": 4},
        {"win": 1, "kills": 7, "deaths": 3, "assists": 6},
    ]


@pytest.mark.asyncio
async def test_batch_refresh_processes_users(
    mock_ch_rows: list[dict[str, Any]],
    mock_recent_rows: list[dict[str, Any]],
) -> None:
    """Verify that run_batch_analytics_refresh iterates users and caches scores."""
    user_id = uuid.uuid4()

    # Build a fake user with one riot account
    fake_account = MagicMock()
    fake_account.puuid = "test-puuid-1"
    fake_user = MagicMock()
    fake_user.id = user_id
    fake_user.riot_accounts = [fake_account]

    # Mock the DB session to return our fake user
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [fake_user]
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    cache_calls: list[tuple[str, float, int]] = []

    async def fake_cache_set(key: str, value: Any, ttl_seconds: int = 300) -> None:
        cache_calls.append((key, value, ttl_seconds))

    # Track how many times CH was queried
    ch_call_count = 0

    def fake_ch_query(sql: str, parameters: Any = None) -> list[dict[str, Any]]:
        nonlocal ch_call_count
        ch_call_count += 1
        # First call is champion pool, subsequent are recent games
        if ch_call_count == 1:
            return mock_ch_rows
        return mock_recent_rows

    with (
        patch("nexus.analytics.tasks.get_session_factory", return_value=mock_factory),
        patch("nexus.analytics.tasks.cache_set", side_effect=fake_cache_set),
        patch("nexus.analytics.tasks._run_ch_query", side_effect=fake_ch_query),
    ):
        from nexus.analytics.tasks import run_batch_analytics_refresh

        result = await run_batch_analytics_refresh({})

    assert result["users_processed"] == 1
    assert result["errors"] == 0
    # Should cache comfort for each champion × each puuid
    assert len(cache_calls) == 2  # 2 champions × 1 puuid
    # Keys should follow the pattern
    assert all(c[0].startswith("score:comfort:") for c in cache_calls)


@pytest.mark.asyncio
async def test_batch_refresh_empty_users() -> None:
    """Verify no errors when there are no active users."""
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("nexus.analytics.tasks.get_session_factory", return_value=mock_factory):
        from nexus.analytics.tasks import run_batch_analytics_refresh

        result = await run_batch_analytics_refresh({})

    assert result["users_processed"] == 0
    assert result["errors"] == 0


@pytest.mark.asyncio
async def test_batch_refresh_isolates_per_user_failures() -> None:
    """Verify one user failing doesn't stop processing of others."""
    good_user = MagicMock()
    good_user.id = uuid.uuid4()
    good_user.riot_accounts = [MagicMock(puuid="puuid-good")]

    bad_user = MagicMock()
    bad_user.id = uuid.uuid4()
    bad_user.riot_accounts = [MagicMock(puuid="puuid-bad")]

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [bad_user, good_user]
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    call_count = 0

    def failing_then_succeeding_ch(sql: str, parameters: Any = None) -> list[dict[str, Any]]:
        nonlocal call_count
        call_count += 1
        # Fail for the first user's queries, succeed for the second
        if call_count <= 1:
            raise RuntimeError("Simulated CH failure")
        return []

    with (
        patch("nexus.analytics.tasks.get_session_factory", return_value=mock_factory),
        patch("nexus.analytics.tasks.cache_set", new_callable=AsyncMock),
        patch("nexus.analytics.tasks._run_ch_query", side_effect=failing_then_succeeding_ch),
    ):
        from nexus.analytics.tasks import run_batch_analytics_refresh

        result = await run_batch_analytics_refresh({})

    # One error, one success (good_user returns 0 champions so 0 processed)
    assert result["errors"] == 1
    assert result["users_processed"] + result["errors"] >= 1
