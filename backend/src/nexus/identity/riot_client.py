"""Riot API calls specific to identity: resolve PUUID, check summoner icon."""

from __future__ import annotations

import logging
import random
from typing import Any

from nexus.shared.exceptions import NotFoundError, RiotAPIError
from nexus.shared.riot_api import get_riot_client

logger = logging.getLogger(__name__)

# Icons used for verification — user sets one of these
VERIFICATION_ICONS: list[int] = list(range(1, 29))


async def resolve_puuid(game_name: str, tag_line: str, region: str = "na1") -> dict[str, Any]:
    """Resolve a Riot ID to PUUID via Account-v1."""
    client = get_riot_client()
    data = await client.get_account_by_riot_id(game_name, tag_line, region)
    if data is None:
        raise NotFoundError(f"Riot account not found: {game_name}#{tag_line}")
    return data


async def verify_summoner_icon(puuid: str, expected_icon_id: int, region: str = "na1") -> bool:
    """Check if the summoner's current icon matches the expected verification icon."""
    client = get_riot_client()
    summoner = await client.get_summoner_by_puuid(puuid, region)
    if summoner is None:
        raise RiotAPIError("Failed to retrieve summoner data for verification")

    current_icon = summoner.get("profileIconId")
    logger.info(
        "Verification check: expected icon %d, current icon %d",
        expected_icon_id,
        current_icon,
    )
    return current_icon == expected_icon_id


def generate_verification_token() -> int:
    """Generate a random summoner icon ID for verification."""
    return random.choice(VERIFICATION_ICONS)  # noqa: S311
