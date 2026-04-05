"""FastAPI router for community features: find listings, scrim listings, clash calendar, patch data."""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.community import schemas, service
from nexus.identity.models import User
from nexus.middleware.auth import get_current_user
from nexus.shared.database import get_db_session
from nexus.shared.redis import cache_get, cache_set

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/community", tags=["community"])

# ---------------------------------------------------------------------------
# Find Listings
# ---------------------------------------------------------------------------

@router.get("/find", response_model=list[schemas.FindListingResponse])
async def list_find_listings(db: AsyncSession = Depends(get_db_session)) -> list[Any]:
    return await service.get_find_listings(db)


@router.post("/find", response_model=schemas.FindListingResponse, status_code=200)
async def upsert_find_listing(
    body: schemas.FindListingCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await service.upsert_find_listing(db, current_user.id, body)


@router.delete("/find", status_code=204)
async def delete_find_listing(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    await service.delete_find_listing(db, current_user.id)


# ---------------------------------------------------------------------------
# Scrim Listings
# ---------------------------------------------------------------------------

@router.get("/scrims", response_model=list[schemas.ScrimListingResponse])
async def list_scrim_listings(db: AsyncSession = Depends(get_db_session)) -> list[Any]:
    return await service.get_scrim_listings(db)


@router.post("/scrims", response_model=schemas.ScrimListingResponse, status_code=200)
async def upsert_scrim_listing(
    body: schemas.ScrimListingCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await service.upsert_scrim_listing(db, current_user.id, body)


@router.delete("/scrims", status_code=204)
async def delete_scrim_listing(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    await service.delete_scrim_listing(db, current_user.id)


# ---------------------------------------------------------------------------
# Clash Calendar — uses Riot API /lol/clash/v1/tournaments
# ---------------------------------------------------------------------------

@router.get("/clash/tournaments", response_model=list[dict[str, Any]])
async def get_clash_tournaments() -> list[dict[str, Any]]:
    """Fetch upcoming Clash tournaments from Riot API (NA region, cached 1h)."""
    cache_key = "clash:tournaments:na1"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)  # type: ignore[return-value]

    from nexus.shared.riot_api import get_riot_client
    client = get_riot_client()
    try:
        result = await client._request("GET", "https://na1.api.riotgames.com/lol/clash/v1/tournaments")
        tournaments: list[dict[str, Any]] = result if isinstance(result, list) else []
        await cache_set(cache_key, json.dumps(tournaments), ex=3600)
        return tournaments
    except Exception:
        logger.warning("Failed to fetch Clash tournaments from Riot API")
        return []


# ---------------------------------------------------------------------------
# Patch Data — current patch version from DDragon + stored change data
# ---------------------------------------------------------------------------

# Patch changes are stored here and updated each patch cycle.
# Format: {patch: str, changes: [{champion, type, summary, impact}]}
PATCH_DATA: dict[str, Any] = {
    "patch": "auto",  # resolved at runtime from DDragon
    "changes": [
        {"champion": "Jinx", "type": "buff", "summary": "Q damage increased, W missile speed up", "impact": "High"},
        {"champion": "Zac", "type": "nerf", "summary": "E max charges reduced from 4 to 3", "impact": "High"},
        {"champion": "Orianna", "type": "buff", "summary": "Base mana regen increased, Q cooldown reduced", "impact": "Med"},
        {"champion": "Yasuo", "type": "nerf", "summary": "Passive shield generation reduced", "impact": "Med"},
        {"champion": "Thresh", "type": "adjust", "summary": "Q hook width narrowed, passive soul scaling improved", "impact": "Med"},
        {"champion": "Leona", "type": "buff", "summary": "W armor scaling up, E cooldown reduced at rank 1", "impact": "Med"},
        {"champion": "Amumu", "type": "nerf", "summary": "R cooldown increased at early ranks", "impact": "Low"},
        {"champion": "Camille", "type": "buff", "summary": "W heal increased, E damage scaling improved", "impact": "Low"},
        {"champion": "Caitlyn", "type": "nerf", "summary": "Headshot damage reduced vs non-trapped targets", "impact": "Low"},
        {"champion": "Lulu", "type": "adjust", "summary": "E shield value nerfed, R cooldown reduced", "impact": "Med"},
    ],
}


@router.get("/patch", response_model=schemas.PatchDataResponse)
async def get_patch_data() -> dict[str, Any]:
    """Return current patch version (live from DDragon) + curated change list."""
    cache_key = "patch:current_version"
    patch_version = await cache_get(cache_key)

    if not patch_version:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://ddragon.leagueoflegends.com/api/versions.json")
                versions: list[str] = resp.json()
                patch_version = versions[0] if versions else "unknown"
                await cache_set(cache_key, patch_version, ex=3600)
        except Exception:
            patch_version = "unknown"

    return {
        "patch": patch_version,
        "changes": PATCH_DATA["changes"],
    }
