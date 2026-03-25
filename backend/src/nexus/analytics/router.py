"""FastAPI router for analytics endpoints."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.analytics import service
from nexus.analytics.schemas import (
    ChampionPoolResponse,
    ChampionTrendsResponse,
    DuoOverlapResponse,
    GoldDiffResponse,
    HeadToHeadResponse,
    PerformanceStats,
)
from nexus.middleware.auth import get_current_user
from nexus.shared.database import get_db_session
from nexus.shared.exceptions import ForbiddenError

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
    if user_id != current_user["user_id"]:
        raise ForbiddenError("Cannot access another user's analytics")
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
    if user_id != current_user["user_id"]:
        raise ForbiddenError("Cannot access another user's analytics")
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


@router.get("/duo-overlap/{puuid1}/{puuid2}", response_model=DuoOverlapResponse)
async def get_duo_overlap(puuid1: str, puuid2: str) -> dict[str, Any]:
    """Public: compare champion pools of two players."""
    return await service.get_duo_overlap(puuid1, puuid2)


@router.get("/champion-trends/{puuid}", response_model=ChampionTrendsResponse)
async def get_champion_trends(
    puuid: str,
    limit_per_champ: int = Query(default=10, ge=1, le=20),
) -> dict[str, Any]:
    """Public: recent win/loss results per champion for sparkline display."""
    return await service.get_champion_recent_games(puuid, limit_per_champ=limit_per_champ)


@router.get("/head-to-head/{puuid1}/{puuid2}", response_model=HeadToHeadResponse)
async def get_head_to_head(
    puuid1: str,
    puuid2: str,
    limit: int = Query(default=20, ge=1, le=50),
) -> dict[str, Any]:
    """Public: head-to-head history between two players."""
    return await service.get_head_to_head(puuid1, puuid2, limit=limit)
