"""Widget-optimized API endpoints for partner consumption."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query

from nexus.middleware.partner_auth import verify_partner_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/widgets", tags=["widgets"])


@router.get("/profile/{user_id}")
async def widget_profile(
    user_id: str,
    _partner: dict[str, Any] = Depends(verify_partner_key),
) -> dict[str, Any]:
    """Bundled profile: user info + champion pool + performance."""
    from nexus.analytics.service import get_champion_pool, get_performance_stats
    from nexus.identity.service import get_user_profile

    profile = await get_user_profile(user_id)
    champion_pool = await get_champion_pool(user_id)
    performance = await get_performance_stats(user_id)

    return {
        "profile": profile,
        "champion_pool": champion_pool,
        "performance": performance,
    }


@router.get("/draft/scores/{session_id}")
async def widget_draft_scores(
    session_id: str,
    _partner: dict[str, Any] = Depends(verify_partner_key),
) -> dict[str, Any]:
    """Bundled draft: scores + suggestions."""
    from nexus.draft.router import _get_draft_scores, _get_suggestions

    scores = await _get_draft_scores(session_id)
    suggestions = await _get_suggestions(session_id)

    return {
        "scores": scores,
        "suggestions": suggestions,
    }


@router.get("/synergy")
async def widget_synergy(
    champions: str = Query(..., description="Comma-separated champion IDs"),
    _partner: dict[str, Any] = Depends(verify_partner_key),
) -> list[dict[str, Any]]:
    """Pairwise synergy scores for a list of champions."""
    from nexus.draft.engine import get_synergy_pair

    champion_ids = [int(c.strip()) for c in champions.split(",") if c.strip()]
    results: list[dict[str, Any]] = []

    for i in range(len(champion_ids)):
        for j in range(i + 1, len(champion_ids)):
            pair = await get_synergy_pair(
                champion_ids[i], champion_ids[j], patch="14.10", queue_id=420
            )
            results.append({
                "champion_a": champion_ids[i],
                "champion_b": champion_ids[j],
                "synergy_score": pair["synergy_score"],
                "games_played": pair["games_played"],
                "confidence": pair["confidence"],
            })

    return results
