"""Unit tests for League-v4 ranked endpoint, schemas, and queue blocklist."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch

import pytest

os.environ.setdefault("RIOT_API_KEY", "RGAPI-test-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

from nexus.match.schemas import BLOCKED_QUEUE_IDS, IngestRequest
from nexus.summoner.schemas import PublicSummonerProfile, RankedDataResponse, RankedEntry


# ---------------------------------------------------------------------------
# Queue blocklist tests
# ---------------------------------------------------------------------------


class TestQueueBlocklist:
    """Tests for BLOCKED_QUEUE_IDS and IngestRequest validation."""

    def test_blocked_queue_ids_contains_70(self):
        """Queue 70 (custom matches) must be in the blocklist."""
        assert 70 in BLOCKED_QUEUE_IDS

    def test_ingest_request_rejects_queue_70(self):
        """IngestRequest should reject queue 70 via field_validator."""
        with pytest.raises(Exception, match="blocked per Riot TOS"):
            IngestRequest(queue_ids=[420, 70])

    def test_ingest_request_accepts_valid_queues(self):
        """IngestRequest should accept queues not in the blocklist."""
        req = IngestRequest(queue_ids=[420, 700])
        assert req.queue_ids == [420, 700]

    def test_ingest_request_rejects_only_blocked_queue(self):
        """IngestRequest should reject even a single blocked queue."""
        with pytest.raises(Exception, match="blocked per Riot TOS"):
            IngestRequest(queue_ids=[70])


# ---------------------------------------------------------------------------
# Ranked schema tests
# ---------------------------------------------------------------------------


class TestRankedSchemas:
    """Tests for RankedEntry and RankedDataResponse schemas."""

    def test_ranked_entry_defaults(self):
        """RankedEntry boolean fields default to False."""
        entry = RankedEntry(
            queue_type="RANKED_SOLO_5x5",
            tier="GOLD",
            rank="II",
            league_points=45,
            wins=100,
            losses=90,
        )
        assert entry.hot_streak is False
        assert entry.veteran is False
        assert entry.fresh_blood is False
        assert entry.inactive is False

    def test_ranked_data_response_empty_entries(self):
        """RankedDataResponse should allow an empty entries list (unranked)."""
        resp = RankedDataResponse(
            puuid="abc-123",
            summoner_id="summ-456",
            entries=[],
        )
        assert resp.entries == []
        assert resp.puuid == "abc-123"
        assert resp.summoner_id == "summ-456"

    def test_ranked_data_response_with_entries(self):
        """RankedDataResponse should contain properly typed entries."""
        entry = RankedEntry(
            queue_type="RANKED_SOLO_5x5",
            tier="PLATINUM",
            rank="I",
            league_points=75,
            wins=120,
            losses=100,
            hot_streak=True,
        )
        resp = RankedDataResponse(
            puuid="abc",
            summoner_id="summ",
            entries=[entry],
        )
        assert len(resp.entries) == 1
        assert resp.entries[0].tier == "PLATINUM"
        assert resp.entries[0].hot_streak is True

    def test_public_summoner_profile_has_summoner_id(self):
        """PublicSummonerProfile should include the summoner_id field."""
        profile = PublicSummonerProfile(
            puuid="p1",
            summoner_id="s1",
            game_name="Player",
            tag_line="NA1",
            region="na1",
            summoner_level=100,
            profile_icon_id=1234,
        )
        assert profile.summoner_id == "s1"


# ---------------------------------------------------------------------------
# RiotAPIClient.get_league_entries tests
# ---------------------------------------------------------------------------


class TestGetLeagueEntries:
    """Tests for the get_league_entries method on RiotAPIClient."""

    @pytest.mark.asyncio
    async def test_get_league_entries_returns_list(self):
        """get_league_entries should return a list of dicts from the API."""
        mock_response = [
            {
                "queueType": "RANKED_SOLO_5x5",
                "tier": "GOLD",
                "rank": "II",
                "leaguePoints": 45,
                "wins": 100,
                "losses": 90,
                "hotStreak": False,
                "veteran": True,
                "freshBlood": False,
                "inactive": False,
            }
        ]

        with patch("nexus.shared.riot_api._riot_client", None):
            from nexus.shared.riot_api import RiotAPIClient

            client = RiotAPIClient()
            client._request = AsyncMock(return_value=mock_response)

            result = await client.get_league_entries("summ-123", region="na1")
            assert isinstance(result, list)
            assert len(result) == 1
            assert result[0]["tier"] == "GOLD"

            client._request.assert_called_once_with(
                "GET",
                "https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/summ-123",
                cache_key="riot:league:summ-123",
                cache_ttl=300,
            )

    @pytest.mark.asyncio
    async def test_get_league_entries_empty(self):
        """get_league_entries should return [] when API returns None (unranked)."""
        with patch("nexus.shared.riot_api._riot_client", None):
            from nexus.shared.riot_api import RiotAPIClient

            client = RiotAPIClient()
            client._request = AsyncMock(return_value=None)

            result = await client.get_league_entries("summ-unranked", region="euw1")
            assert result == []


# ---------------------------------------------------------------------------
# Ranked endpoint tests
# ---------------------------------------------------------------------------


class TestRankedEndpoint:
    """Tests for the GET /{region}/{game_name}/{tag_line}/ranked endpoint."""

    @pytest.mark.asyncio
    async def test_ranked_endpoint_returns_schema(self):
        """Endpoint should return RankedDataResponse with entries."""
        mock_account = {"puuid": "puuid-123", "gameName": "Player", "tagLine": "NA1"}
        mock_summoner = {"id": "summ-456", "summonerLevel": 100, "profileIconId": 1}
        mock_league = [
            {
                "queueType": "RANKED_SOLO_5x5",
                "tier": "DIAMOND",
                "rank": "IV",
                "leaguePoints": 30,
                "wins": 200,
                "losses": 180,
                "hotStreak": True,
                "veteran": False,
                "freshBlood": False,
                "inactive": False,
            }
        ]

        mock_client = AsyncMock()
        mock_client.get_account_by_riot_id.return_value = mock_account
        mock_client.get_summoner_by_puuid.return_value = mock_summoner
        mock_client.get_league_entries.return_value = mock_league

        with patch("nexus.summoner.router.get_riot_client", return_value=mock_client):
            from nexus.summoner.router import get_ranked_data

            result = await get_ranked_data("na1", "Player", "NA1")

        assert isinstance(result, RankedDataResponse)
        assert result.puuid == "puuid-123"
        assert result.summoner_id == "summ-456"
        assert len(result.entries) == 1
        assert result.entries[0].tier == "DIAMOND"
        assert result.entries[0].hot_streak is True

    @pytest.mark.asyncio
    async def test_ranked_endpoint_unranked(self):
        """Endpoint should return empty entries for an unranked summoner."""
        mock_account = {"puuid": "puuid-unranked", "gameName": "Noob", "tagLine": "NEW"}
        mock_summoner = {"id": "summ-789", "summonerLevel": 5, "profileIconId": 1}

        mock_client = AsyncMock()
        mock_client.get_account_by_riot_id.return_value = mock_account
        mock_client.get_summoner_by_puuid.return_value = mock_summoner
        mock_client.get_league_entries.return_value = []

        with patch("nexus.summoner.router.get_riot_client", return_value=mock_client):
            from nexus.summoner.router import get_ranked_data

            result = await get_ranked_data("na1", "Noob", "NEW")

        assert isinstance(result, RankedDataResponse)
        assert result.entries == []
        assert result.summoner_id == "summ-789"

    @pytest.mark.asyncio
    async def test_ranked_endpoint_account_not_found(self):
        """Endpoint should raise NotFoundError when account doesn't exist."""
        mock_client = AsyncMock()
        mock_client.get_account_by_riot_id.return_value = None

        with (
            patch("nexus.summoner.router.get_riot_client", return_value=mock_client),
            pytest.raises(Exception, match="Riot account not found"),
        ):
            from nexus.summoner.router import get_ranked_data

            await get_ranked_data("na1", "Ghost", "404")
