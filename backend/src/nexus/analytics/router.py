"""FastAPI router for analytics endpoints."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.analytics import service
from nexus.analytics.schemas import (
    ChampionPoolResponse,
    GoldDiffResponse,
    PerformanceStats,
)
from nexus.middleware.auth import get_current_user
from nexus.shared.database import get_db_session

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/champion-pool/{user_id}", response_model=ChampionPoolResponse)
async def get_champion_pool(
    user_id: UUID,
    patch: str | None = Query(default=None),
    queue_id: int | None = Query(default=None),
    role: str | None = Query(default=None),
    sort_by: str = Query(
        default="games_played",
        pattern=r"^(games_played|win_rate|true_mastery|comfort_score)$",
    ),
    sort_order: str = Query(default="desc", pattern=r"^(asc|desc)$"),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Get champion pool with True Mastery and Comfort scores."""
    return await service.get_champion_pool(
        db,
        user_id,
        patch=patch,
        queue_id=queue_id,
        role=role,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/performance/{user_id}", response_model=PerformanceStats)
async def get_performance(
    user_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Get aggregated performance stats across all linked accounts."""
    return await service.get_performance(db, user_id)


@router.get("/gold-diff/{match_id}", response_model=GoldDiffResponse)
async def get_gold_diff(
    match_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get gold diff timeline for a match."""
    return await service.get_gold_diff(match_id)


@router.get("/champion-pool-by-puuid/{puuid}", response_model=ChampionPoolResponse)
async def get_champion_pool_by_puuid(
    puuid: str,
    patch: str | None = Query(default=None),
    queue_id: int | None = Query(default=None),
    role: str | None = Query(default=None),
    sort_by: str = Query(
        default="games_played",
        pattern=r"^(games_played|win_rate|true_mastery|comfort_score)$",
    ),
    sort_order: str = Query(default="desc", pattern=r"^(asc|desc)$"),
) -> dict[str, Any]:
    """Public: champion pool for a single PUUID."""
    return await service.get_champion_pool_by_puuid(
        puuid,
        patch=patch,
        queue_id=queue_id,
        role=role,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/performance-by-puuid/{puuid}", response_model=PerformanceStats)
async def get_performance_by_puuid(puuid: str) -> dict[str, Any]:
    """Public: performance stats for a single PUUID."""
    return await service.get_performance_by_puuid(puuid)
