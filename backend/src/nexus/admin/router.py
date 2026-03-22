"""FastAPI router for admin and ops endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Response

from nexus.admin.schemas import (
    CreatePartnerKeyRequest,
    HealthResponse,
    LatestPatchResponse,
    PartnerKeyListResponse,
    PartnerKeyResponse,
    RiotQuotaResponse,
    SynergyRebuildResponse,
)
from nexus.config import get_settings
from nexus.middleware.auth import get_current_user
from nexus.shared.database import get_db_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> dict[str, str]:
    """Health check endpoint — no auth required."""
    settings = get_settings()
    return {
        "status": "ok",
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.get("/metrics")
async def prometheus_metrics(
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Expose Prometheus metrics. Requires authentication."""
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@router.get("/riot-quota", response_model=RiotQuotaResponse)
async def riot_quota(
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Show current Riot API quota usage. Requires authentication."""
    from nexus.shared.riot_api import get_riot_client

    client = get_riot_client()
    return {
        "per_second_limit": client.per_second_bucket.rate,
        "per_2min_limit": client.per_2min_bucket.rate,
        "per_second_used_pct": round(client.per_second_bucket.usage_ratio * 100, 1),
        "per_2min_used_pct": round(client.per_2min_bucket.usage_ratio * 100, 1),
        "auto_backoff_active": client.per_2min_bucket.usage_ratio >= 0.8,
    }


@router.post("/synergy/rebuild", response_model=SynergyRebuildResponse)
async def rebuild_synergy(
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """Trigger a synergy/counter matrix rebuild from match data."""
    from nexus.draft.tasks import _rebuild_counter, _rebuild_synergy, _resolve_latest_patch

    settings = get_settings()
    logger.info("Synergy matrix rebuild triggered")

    patch = _resolve_latest_patch()
    if patch == "unknown":
        return {
            "status": "completed",
            "message": "No recent match data found — matrices not rebuilt",
        }

    for queue_id in (420, 700):
        _rebuild_synergy(patch, queue_id, min_games=settings.matrix_min_games)
        _rebuild_counter(patch, queue_id, min_games=settings.matrix_min_games)

    logger.info("Synergy and counter matrix rebuild completed")
    return {
        "status": "completed",
        "message": "Synergy and counter matrices rebuilt successfully",
    }


@router.get("/latest-patch", response_model=LatestPatchResponse)
async def latest_patch() -> dict[str, str]:
    """Return the latest game patch version from match data. No auth required."""
    from nexus.draft.tasks import _resolve_latest_patch

    return {"patch": _resolve_latest_patch()}


@router.get("/partner-keys", response_model=PartnerKeyListResponse)
async def list_partner_api_keys(
    _current_user: dict[str, Any] = Depends(get_current_user),
    db: Any = Depends(get_db_session),
) -> dict[str, Any]:
    """List all partner API keys (name, usage, status). Admin only."""
    from nexus.admin.partner_keys import list_partner_keys

    return await list_partner_keys(db)


@router.post("/partner-keys", response_model=PartnerKeyResponse)
async def create_partner_api_key(
    body: CreatePartnerKeyRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    db: Any = Depends(get_db_session),
) -> dict[str, Any]:
    """Create a new partner API key. Admin only."""
    from nexus.admin.partner_keys import create_partner_key

    return await create_partner_key(
        db,
        body.partner_name,
        body.rate_limit_per_minute,
        body.allowed_origins,
    )


@router.delete("/partner-keys/{key_id}")
async def delete_partner_api_key(
    key_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    db: Any = Depends(get_db_session),
) -> dict[str, str]:
    """Revoke a partner API key. Admin only."""
    from nexus.admin.partner_keys import revoke_partner_key

    success = await revoke_partner_key(db, key_id)
    if not success:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Partner key not found")
    return {"status": "revoked"}
