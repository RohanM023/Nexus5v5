"""FastAPI router for public summoner lookup."""

from __future__ import annotations

from fastapi import APIRouter

from nexus.shared.exceptions import NotFoundError
from nexus.shared.riot_api import get_riot_client
from nexus.summoner import schemas

router = APIRouter(prefix="/api/v1/summoner", tags=["summoner"])


@router.get("/{region}/{game_name}/{tag_line}", response_model=schemas.PublicSummonerProfile)
async def lookup_summoner(region: str, game_name: str, tag_line: str) -> schemas.PublicSummonerProfile:
    """Resolve a Riot ID to a public summoner profile.

    This endpoint is intentionally unauthenticated to support public profile lookups.
    """
    client = get_riot_client()

    account = await client.get_account_by_riot_id(game_name, tag_line, region=region)
    if not account:
        raise NotFoundError(f'Riot account not found: {game_name}#{tag_line}')

    puuid = str(account.get("puuid") or "")
    if not puuid:
        raise NotFoundError(f'Riot account not found: {game_name}#{tag_line}')

    summoner = await client.get_summoner_by_puuid(puuid, region=region)
    if not summoner:
        raise NotFoundError(f'Summoner not found for Riot ID: {game_name}#{tag_line}')

    return schemas.PublicSummonerProfile(
        puuid=puuid,
        summoner_id=str(summoner.get("id") or ""),
        game_name=str(account.get("gameName") or game_name),
        tag_line=str(account.get("tagLine") or tag_line),
        region=region.lower(),
        summoner_level=int(summoner.get("summonerLevel") or 0),
        profile_icon_id=int(summoner.get("profileIconId") or 0),
    )


@router.get(
    "/{region}/{game_name}/{tag_line}/ranked",
    response_model=schemas.RankedDataResponse,
)
async def get_ranked_data(
    region: str, game_name: str, tag_line: str
) -> schemas.RankedDataResponse:
    """Get ranked data for a summoner by Riot ID."""
    client = get_riot_client()

    account = await client.get_account_by_riot_id(game_name, tag_line, region=region)
    if not account:
        raise NotFoundError(f"Riot account not found: {game_name}#{tag_line}")

    puuid = str(account.get("puuid") or "")
    if not puuid:
        raise NotFoundError(f"Riot account not found: {game_name}#{tag_line}")

    summoner = await client.get_summoner_by_puuid(puuid, region=region)
    if not summoner:
        raise NotFoundError(f"Summoner not found for Riot ID: {game_name}#{tag_line}")

    summoner_id = str(summoner.get("id") or "")
    if not summoner_id:
        raise NotFoundError(f"Summoner ID not found for: {game_name}#{tag_line}")

    league_entries = await client.get_league_entries(summoner_id, region=region)

    entries = [
        schemas.RankedEntry(
            queue_type=entry.get("queueType", ""),
            tier=entry.get("tier", ""),
            rank=entry.get("rank", ""),
            league_points=entry.get("leaguePoints", 0),
            wins=entry.get("wins", 0),
            losses=entry.get("losses", 0),
            hot_streak=entry.get("hotStreak", False),
            veteran=entry.get("veteran", False),
            fresh_blood=entry.get("freshBlood", False),
            inactive=entry.get("inactive", False),
        )
        for entry in league_entries
    ]

    return schemas.RankedDataResponse(
        puuid=puuid,
        summoner_id=summoner_id,
        entries=entries,
    )

