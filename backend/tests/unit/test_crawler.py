"""Unit tests for the match crawler module."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from nexus.shared.exceptions import RateLimitError, RiotAPIError

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_redis() -> AsyncMock:
    """Return a mock async Redis instance with basic primitives."""
    r = AsyncMock()
    r.exists = AsyncMock(return_value=0)
    r.llen = AsyncMock(return_value=0)
    r.scard = AsyncMock(return_value=0)
    r.sismember = AsyncMock(return_value=False)
    r.lpush = AsyncMock()
    r.rpop = AsyncMock(return_value=None)
    r.sadd = AsyncMock()
    r.set = AsyncMock()
    r.delete = AsyncMock()
    r.hincrby = AsyncMock()
    r.hset = AsyncMock()
    r.hgetall = AsyncMock(return_value={})
    r.get = AsyncMock(return_value=None)
    return r


# ---------------------------------------------------------------------------
# Kill switch tests
# ---------------------------------------------------------------------------


class TestKillSwitch:
    async def test_kill_switch_inactive(self, mock_redis: AsyncMock) -> None:
        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import is_kill_switch_active

            mock_redis.exists = AsyncMock(return_value=0)
            assert await is_kill_switch_active() is False

    async def test_kill_switch_active(self, mock_redis: AsyncMock) -> None:
        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import is_kill_switch_active

            mock_redis.exists = AsyncMock(return_value=1)
            assert await is_kill_switch_active() is True


# ---------------------------------------------------------------------------
# Circuit breaker tests
# ---------------------------------------------------------------------------


class TestCircuitBreaker:
    async def test_circuit_breaker_inactive(self, mock_redis: AsyncMock) -> None:
        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import is_circuit_breaker_active

            mock_redis.exists = AsyncMock(return_value=0)
            assert await is_circuit_breaker_active() is False

    async def test_circuit_breaker_active(self, mock_redis: AsyncMock) -> None:
        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import is_circuit_breaker_active

            mock_redis.exists = AsyncMock(return_value=1)
            assert await is_circuit_breaker_active() is True

    async def test_trip_sets_key_with_ttl(self, mock_redis: AsyncMock) -> None:
        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import CIRCUIT_BREAKER_KEY, trip_circuit_breaker

            await trip_circuit_breaker(600, "na1", "rate_limit")

            mock_redis.set.assert_awaited_once_with(CIRCUIT_BREAKER_KEY, "rate_limit", ex=600)


# ---------------------------------------------------------------------------
# Seed phase tests
# ---------------------------------------------------------------------------


class TestSeedFromLadder:
    async def test_seed_pushes_new_puuids(self, mock_redis: AsyncMock) -> None:
        """Seeding should resolve summoner IDs to PUUIDs and queue unseen ones."""
        mock_client = AsyncMock()
        mock_client.get_challenger_league = AsyncMock(
            return_value={
                "entries": [{"summonerId": "sid1"}, {"summonerId": "sid2"}],
            }
        )
        mock_client.get_grandmaster_league = AsyncMock(return_value={"entries": []})
        mock_client.get_summoner_by_id = AsyncMock(
            side_effect=[
                {"puuid": "puuid-aaa"},
                {"puuid": "puuid-bbb"},
            ]
        )

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
        ):
            from nexus.match.crawler import seed_from_ladder

            count = await seed_from_ladder("na1")
            assert count == 2
            assert mock_redis.lpush.await_count == 2

    async def test_seed_skips_already_seen(self, mock_redis: AsyncMock) -> None:
        """Should not re-queue PUUIDs already in the seen set."""
        mock_client = AsyncMock()
        mock_client.get_challenger_league = AsyncMock(
            return_value={"entries": [{"summonerId": "sid1"}]}
        )
        mock_client.get_grandmaster_league = AsyncMock(return_value={"entries": []})
        mock_client.get_summoner_by_id = AsyncMock(return_value={"puuid": "puuid-seen"})

        mock_redis.sismember = AsyncMock(return_value=True)

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
        ):
            from nexus.match.crawler import seed_from_ladder

            count = await seed_from_ladder("na1")
            assert count == 0

    async def test_seed_handles_empty_ladder(self, mock_redis: AsyncMock) -> None:
        """Should handle gracefully when ladder returns no entries."""
        mock_client = AsyncMock()
        mock_client.get_challenger_league = AsyncMock(return_value=None)
        mock_client.get_grandmaster_league = AsyncMock(return_value=None)

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
        ):
            from nexus.match.crawler import seed_from_ladder

            count = await seed_from_ladder("na1")
            assert count == 0

    async def test_seed_stops_on_kill_switch(self, mock_redis: AsyncMock) -> None:
        """Kill switch during seed should halt processing."""
        mock_client = AsyncMock()
        mock_client.get_challenger_league = AsyncMock(
            return_value={
                "entries": [{"summonerId": "sid1"}, {"summonerId": "sid2"}],
            }
        )
        mock_client.get_grandmaster_league = AsyncMock(return_value={"entries": []})
        mock_client.get_summoner_by_id = AsyncMock(return_value={"puuid": "puuid-aaa"})
        # Kill switch activates after first exists check
        mock_redis.exists = AsyncMock(side_effect=[1])

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
        ):
            from nexus.match.crawler import seed_from_ladder

            count = await seed_from_ladder("na1")
            assert count == 0


# ---------------------------------------------------------------------------
# Player discovery tests
# ---------------------------------------------------------------------------


class TestDiscoverPlayers:
    async def test_discover_returns_puuids(self) -> None:
        mock_rows = [{"puuid": "p1"}, {"puuid": "p2"}, {"puuid": "p3"}]
        with patch("nexus.match.crawler.ch") as mock_ch:
            mock_ch.query = MagicMock(return_value=mock_rows)

            from nexus.match.crawler import _discover_players

            result = await _discover_players("crawled-puuid", "na1")
            assert result == ["p1", "p2", "p3"]

    async def test_discover_handles_query_failure(self) -> None:
        with patch("nexus.match.crawler.ch") as mock_ch:
            mock_ch.query = MagicMock(side_effect=Exception("CH down"))

            from nexus.match.crawler import _discover_players

            result = await _discover_players("crawled-puuid", "na1")
            assert result == []


class TestPushNewPlayers:
    async def test_push_filters_seen(self, mock_redis: AsyncMock) -> None:
        """Should only queue PUUIDs not in the seen set."""
        mock_redis.sismember = AsyncMock(side_effect=[False, True, False])

        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import _push_new_players

            count = await _push_new_players(["p1", "p2", "p3"], "na1")
            assert count == 2
            assert mock_redis.lpush.await_count == 2


# ---------------------------------------------------------------------------
# Main crawler cycle tests
# ---------------------------------------------------------------------------


class TestRunCrawlerCycle:
    async def test_cycle_aborts_on_kill_switch(self, mock_redis: AsyncMock) -> None:
        mock_redis.exists = AsyncMock(return_value=1)

        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import run_crawler_cycle

            result = await run_crawler_cycle("na1")
            assert result["status"] == "killed"

    async def test_cycle_aborts_on_circuit_breaker(self, mock_redis: AsyncMock) -> None:
        # kill switch off, then circuit breaker on
        mock_redis.exists = AsyncMock(side_effect=[0, 1])

        with patch("nexus.match.crawler.get_redis", return_value=mock_redis):
            from nexus.match.crawler import run_crawler_cycle

            result = await run_crawler_cycle("na1")
            assert result["status"] == "circuit_break"

    async def test_cycle_seeds_when_queue_empty(self, mock_redis: AsyncMock) -> None:
        """When queue is empty, should seed and report no_players if still empty."""
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.llen = AsyncMock(return_value=0)

        mock_client = AsyncMock()
        mock_client.get_account_by_puuid = AsyncMock(return_value={"puuid": "test"})
        mock_client.get_challenger_league = AsyncMock(return_value=None)
        mock_client.get_grandmaster_league = AsyncMock(return_value=None)

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
        ):
            from nexus.match.crawler import run_crawler_cycle

            result = await run_crawler_cycle("na1")
            assert result["status"] == "no_players"

    async def test_cycle_processes_players(self, mock_redis: AsyncMock) -> None:
        """Full cycle: pop a player, ingest, discover, push new players."""
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.llen = AsyncMock(return_value=1)
        mock_redis.rpop = AsyncMock(side_effect=["puuid-test", None])
        mock_redis.sismember = AsyncMock(return_value=False)

        mock_client = AsyncMock()
        mock_client.get_account_by_puuid = AsyncMock(return_value={"puuid": "canary"})

        mock_ingest: dict[str, int] = {
            "matches_fetched": 5,
            "matches_inserted": 3,
        }
        mock_discovered: list[dict[str, str]] = [
            {"puuid": "new-p1"},
            {"puuid": "new-p2"},
        ]

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
            patch(
                "nexus.match.crawler.ingest_matches",
                new_callable=AsyncMock,
                return_value=mock_ingest,
            ),
            patch("nexus.match.crawler.ch") as mock_ch,
            patch("nexus.match.crawler.asyncio") as mock_asyncio,
        ):
            mock_ch.query = MagicMock(return_value=mock_discovered)
            mock_asyncio.sleep = AsyncMock()
            mock_asyncio.get_running_loop = MagicMock()
            mock_asyncio.get_running_loop.return_value.run_in_executor = AsyncMock(
                return_value=mock_discovered
            )

            from nexus.match.crawler import run_crawler_cycle

            result = await run_crawler_cycle("na1", max_players=5, sleep_between=0)
            assert result["status"] == "ok"
            assert result["players_processed"] == 1
            assert result["matches_inserted"] == 3

    async def test_cycle_trips_on_rate_limit(self, mock_redis: AsyncMock) -> None:
        """Rate limit during ingestion should trip circuit breaker."""
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.llen = AsyncMock(return_value=1)
        mock_redis.rpop = AsyncMock(return_value="puuid-rl")

        mock_client = AsyncMock()
        mock_client.get_account_by_puuid = AsyncMock(return_value={"puuid": "canary"})

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
            patch(
                "nexus.match.crawler.ingest_matches",
                new_callable=AsyncMock,
                side_effect=RateLimitError("429"),
            ),
            patch("nexus.match.crawler.asyncio") as mock_asyncio,
        ):
            mock_asyncio.sleep = AsyncMock()

            from nexus.match.crawler import run_crawler_cycle

            result = await run_crawler_cycle("na1", max_players=5, sleep_between=0)
            assert result["status"] == "ok"
            # Circuit breaker should have been tripped
            mock_redis.set.assert_awaited()

    async def test_cycle_trips_on_consecutive_failures(self, mock_redis: AsyncMock) -> None:
        """Three consecutive API errors should trip circuit breaker."""
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.llen = AsyncMock(return_value=5)
        mock_redis.rpop = AsyncMock(side_effect=["p1", "p2", "p3", "p4", None])

        mock_client = AsyncMock()
        mock_client.get_account_by_puuid = AsyncMock(return_value={"puuid": "canary"})

        with (
            patch("nexus.match.crawler.get_redis", return_value=mock_redis),
            patch("nexus.match.crawler.get_riot_client", return_value=mock_client),
            patch(
                "nexus.match.crawler.ingest_matches",
                new_callable=AsyncMock,
                side_effect=RiotAPIError("server error", status_code=500),
            ),
            patch("nexus.match.crawler.asyncio") as mock_asyncio,
        ):
            mock_asyncio.sleep = AsyncMock()

            from nexus.match.crawler import run_crawler_cycle

            result = await run_crawler_cycle("na1", max_players=5, sleep_between=0)
            assert result["status"] == "ok"
            # Should have tripped after 3 consecutive failures
            mock_redis.set.assert_awaited()


# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------


class TestCrawlerConfig:
    def test_crawler_defaults(self) -> None:
        """Crawler settings should have safe defaults."""
        with patch.dict("os.environ", {}, clear=False):
            from nexus.config import Settings

            s = Settings(
                riot_api_key="RGAPI-test",
                _env_file=None,
            )
            assert s.crawler_enabled is False
            assert s.crawler_max_players_per_cycle == 50
            assert s.crawler_max_api_calls_per_cycle == 500
            assert s.crawler_sleep_between_players == 0.5
            assert s.crawler_match_count == 20

    def test_crawler_enabled_from_env(self) -> None:
        with patch.dict("os.environ", {"CRAWLER_ENABLED": "true"}, clear=False):
            from nexus.config import Settings

            s = Settings(
                riot_api_key="RGAPI-test",
                _env_file=None,
            )
            assert s.crawler_enabled is True
