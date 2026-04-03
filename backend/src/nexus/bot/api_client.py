"""HTTP client for calling the Nexus REST API."""

from __future__ import annotations

from typing import Any

import httpx


class NexusAPIClient:
    """Thin async wrapper around the Nexus API."""

    def __init__(self, base_url: str) -> None:
        self._client = httpx.AsyncClient(base_url=base_url, timeout=15.0)

    async def close(self) -> None:
        await self._client.aclose()

    # --- Summoner ---

    async def lookup_summoner(self, region: str, game_name: str, tag_line: str) -> dict[str, Any]:
        resp = await self._client.get(f"/api/v1/summoner/{region}/{game_name}/{tag_line}")
        resp.raise_for_status()
        return resp.json()

    async def get_ranked(self, region: str, game_name: str, tag_line: str) -> dict[str, Any]:
        resp = await self._client.get(f"/api/v1/summoner/{region}/{game_name}/{tag_line}/ranked")
        resp.raise_for_status()
        return resp.json()

    # --- Analytics ---

    async def get_performance(self, puuid: str) -> dict[str, Any]:
        resp = await self._client.get(f"/api/v1/analytics/performance-by-puuid/{puuid}")
        resp.raise_for_status()
        return resp.json()

    async def get_champion_pool(self, puuid: str) -> dict[str, Any]:
        resp = await self._client.get(f"/api/v1/analytics/champion-pool-by-puuid/{puuid}")
        resp.raise_for_status()
        return resp.json()

    # --- Match ---

    async def get_match_history(
        self,
        puuid: str,
        cursor: str | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        resp = await self._client.get(f"/api/v1/match/history/{puuid}", params=params)
        resp.raise_for_status()
        return resp.json()

    async def get_match_detail(self, match_id: str) -> dict[str, Any]:
        resp = await self._client.get(f"/api/v1/match/detail/{match_id}")
        resp.raise_for_status()
        return resp.json()

    async def trigger_ingestion(self, puuid: str) -> dict[str, Any]:
        resp = await self._client.post(f"/api/v1/match/ingest/{puuid}")
        resp.raise_for_status()
        return resp.json()

    # --- Draft ---

    async def analyze_draft(
        self,
        ally_champions: list[dict[str, Any]],
        opponent_champions: list[dict[str, Any]],
        ally_bans: list[int] | None = None,
        opponent_bans: list[int] | None = None,
        team_puuids: list[str] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "ally_champions": ally_champions,
            "opponent_champions": opponent_champions,
            "ally_bans": ally_bans or [],
            "opponent_bans": opponent_bans or [],
            "team_puuids": team_puuids or [],
        }
        resp = await self._client.post("/api/v1/draft/analyze", json=payload)
        resp.raise_for_status()
        return resp.json()
