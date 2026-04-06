"""FastAPI router for Clash tier list endpoints."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from nexus.middleware.auth import get_admin_user
from nexus.tier_list.schemas import TierListResponse, UpsertTierListRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tier-list", tags=["tier-list"])

# Resolve once at import time; works in dev and Docker (always relative to this file)
_DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "tier_list"


def _list_patches() -> list[str]:
    """Return available patch versions sorted descending."""
    if not _DATA_DIR.exists():
        return []
    return sorted(
        (p.stem for p in _DATA_DIR.glob("*.json")),
        key=lambda v: [int(x) for x in v.split(".")],
        reverse=True,
    )


def _load(patch: str) -> dict[str, Any]:
    path = _DATA_DIR / f"{patch}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Tier list for patch {patch} not found")
    return json.loads(path.read_text())


@router.get("", response_model=TierListResponse)
async def get_tier_list(
    patch: str | None = Query(default=None, description="Patch version, e.g. 14.8. Defaults to latest."),
) -> dict[str, Any]:
    """Return the Clash tier list for a given patch (defaults to latest)."""
    if patch is None:
        patches = _list_patches()
        if not patches:
            raise HTTPException(status_code=404, detail="No tier list data available")
        patch = patches[0]
    return _load(patch)


@router.get("/patches")
async def list_patches() -> dict[str, list[str]]:
    """Return all available patch versions."""
    return {"patches": _list_patches()}


@router.put("", response_model=TierListResponse)
async def upsert_tier_list(
    body: UpsertTierListRequest,
    _current_user: Any = Depends(get_admin_user),
) -> dict[str, Any]:
    """Create or replace the tier list for a patch. Admin only."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = _DATA_DIR / f"{body.patch}.json"
    data = body.model_dump()
    path.write_text(json.dumps(data, indent=2))
    logger.info("Tier list updated for patch %s", body.patch)
    return data
