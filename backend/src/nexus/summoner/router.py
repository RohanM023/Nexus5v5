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
        game_name=str(account.get("gameName") or game_name),
        tag_line=str(account.get("tagLine") or tag_line),
        region=region.lower(),
        summoner_level=int(summoner.get("summonerLevel") or 0),
        profile_icon_id=int(summoner.get("profileIconId") or 0),
    )

