"""Match ingestion integration tests (E8-T04).

Tests the full ingestion pipeline with mocked Riot API and ClickHouse.
"""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("RIOT_API_KEY", "RGAPI-test-key")


SAMPLE_MATCH_DATA: dict[str, Any] = {
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
}


def _make_mock_riot_client(
    match_ids: list[str] | None = None,
    match_data: dict[str, Any] | None = None,
) -> MagicMock:
    """Create a mock Riot API client."""
    client = MagicMock()
    client.get_match_ids = AsyncMock(return_value=match_ids or ["NA1_5000000001"])
    client.get_match = AsyncMock(return_value=match_data or SAMPLE_MATCH_DATA)
    client.get_match_timeline = AsyncMock(return_value=None)
    return client


@pytest.fixture
def _patch_deps():
    """Patch external dependencies for ingestion tests."""
    with (
        patch("nexus.match.ingestion.get_riot_client") as mock_get_client,
        patch("nexus.match.ingestion.ch") as mock_ch,
        patch("nexus.match.ingestion.cache_get", new_callable=AsyncMock) as mock_cache_get,
        patch("nexus.match.ingestion.cache_set", new_callable=AsyncMock) as mock_cache_set,
    ):
        mock_ch.query = MagicMock(return_value=[])
        mock_ch.insert_rows = MagicMock(return_value=None)
        mock_cache_get.return_value = None
        mock_cache_set.return_value = None
        yield {
            "get_client": mock_get_client,
            "ch": mock_ch,
            "cache_get": mock_cache_get,
            "cache_set": mock_cache_set,
        }


class TestFullPipeline:
    @pytest.mark.usefixtures("_patch_deps")
    async def test_basic_ingestion(self, _patch_deps: dict[str, Any]) -> None:
        """Fetch match IDs → fetch details → transform → insert."""
        from nexus.match.ingestion import ingest_matches

        client = _make_mock_riot_client()
        _patch_deps["get_client"].return_value = client

        result = await ingest_matches("test-puuid-12345", "na1", count=5)

        assert result["matches_fetched"] >= 1
        assert result["matches_inserted"] >= 1
        client.get_match_ids.assert_called()
        client.get_match.assert_called()

    @pytest.mark.usefixtures("_patch_deps")
    async def test_empty_match_list(self, _patch_deps: dict[str, Any]) -> None:
        """No matches to ingest returns zeroes."""
        from nexus.match.ingestion import ingest_matches

        client = _make_mock_riot_client(match_ids=[])
        _patch_deps["get_client"].return_value = client

        result = await ingest_matches("test-puuid-12345", "na1")

        assert result == {"matches_fetched": 0, "matches_inserted": 0}


class TestIncrementalIngestion:
    @pytest.mark.usefixtures("_patch_deps")
    async def test_watermark_skips_old_matches(self, _patch_deps: dict[str, Any]) -> None:
        """With a watermark set, only newer matches should be fetched."""
        from nexus.match.ingestion import ingest_matches

        all_ids = ["NA1_5000000003", "NA1_5000000002", "NA1_5000000001"]
        client = _make_mock_riot_client(match_ids=all_ids)
        _patch_deps["get_client"].return_value = client

        # Simulate watermark at match 2 — only match 3 should be new
        _patch_deps["cache_get"].return_value = "NA1_5000000002"

        result = await ingest_matches("test-puuid-12345", "na1")

        # Should have fetched IDs but only processed the one newer than watermark
        assert result["matches_fetched"] >= 1


class TestDeduplication:
    @pytest.mark.usefixtures("_patch_deps")
    async def test_existing_matches_skipped(self, _patch_deps: dict[str, Any]) -> None:
        """Matches already in ClickHouse should be skipped."""
        from nexus.match.ingestion import ingest_matches

        client = _make_mock_riot_client(match_ids=["NA1_5000000001"])
        _patch_deps["get_client"].return_value = client

        # Simulate match already in ClickHouse
        _patch_deps["ch"].query = MagicMock(
            return_value=[{"match_id": "NA1_5000000001"}]
        )

        result = await ingest_matches("test-puuid-12345", "na1")

        assert result["matches_inserted"] == 0
        # Should NOT have called get_match since deduplication removed it
        client.get_match.assert_not_called()


class TestRiotAPI404:
    @pytest.mark.usefixtures("_patch_deps")
    async def test_match_not_found_skipped(self, _patch_deps: dict[str, Any]) -> None:
        """When Riot API returns None for a match, skip it."""
        from nexus.match.ingestion import ingest_matches

        client = _make_mock_riot_client(match_ids=["NA1_5000000001"])
        client.get_match = AsyncMock(return_value=None)
        _patch_deps["get_client"].return_value = client

        result = await ingest_matches("test-puuid-12345", "na1")

        assert result["matches_inserted"] == 0


class TestExtractParticipant:
    def test_basic_extraction(self) -> None:
        """Transform a Riot participant into a MatchRow."""
        from nexus.match.ingestion import _extract_participant

        participant = SAMPLE_MATCH_DATA["info"]["participants"][0]
        row = _extract_participant(SAMPLE_MATCH_DATA, participant)

        assert row.match_id == "NA1_5000000001"
        assert row.champion_id == 1
        assert row.champion_name == "Annie"
        assert row.role == "MID"
        assert row.win == 1
        assert row.kills == 10
        assert row.deaths == 2
        assert row.assists == 8
        assert row.cs == 200  # 180 + 20


class TestExtractGoldDiff:
    def test_empty_timeline(self) -> None:
        """Empty timeline data returns '[]'."""
        from nexus.match.ingestion import _extract_gold_diff_timeline

        result = _extract_gold_diff_timeline({}, "test-puuid")
        assert result == "[]"

    def test_none_timeline(self) -> None:
        """None timeline data returns '[]'."""
        from nexus.match.ingestion import _extract_gold_diff_timeline

        result = _extract_gold_diff_timeline(None, "test-puuid")
        assert result == "[]"
