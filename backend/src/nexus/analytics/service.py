"""Analytics service: champion pool analysis and performance aggregation."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.analytics.metrics import (
    assign_tier,
    compute_comfort,
    compute_recent_form,
    compute_true_mastery,
)
from nexus.identity.models import RiotAccount
from nexus.shared import clickhouse as ch
from nexus.shared.exceptions import NotFoundError
from nexus.shared.redis import cache_set

logger = logging.getLogger(__name__)


async def _get_puuids_for_user(db: AsyncSession, user_id: UUID) -> list[str]:
    """Resolve all linked PUUIDs for a user."""
    result = await db.execute(select(RiotAccount.puuid).where(RiotAccount.user_id == user_id))
    puuids = [row[0] for row in result.all()]
    if not puuids:
        raise NotFoundError("No linked accounts found for this user")
    return puuids


def _build_puuid_filter(puuids: list[str]) -> str:
    """Build a ClickHouse IN clause for PUUIDs."""
    escaped = ", ".join(f"'{p}'" for p in puuids)
    return f"puuid IN ({escaped})"


async def get_champion_pool(
    db: AsyncSession,
    user_id: UUID,
    *,
    patch: str | None = None,
    queue_id: int | None = None,
) -> dict[str, Any]:
    """Compute champion pool with True Mastery and Comfort scores."""
    puuids = await _get_puuids_for_user(db, user_id)
    puuid_filter = _build_puuid_filter(puuids)

    conditions = [puuid_filter]
    if patch is not None:
        conditions.append(f"game_version LIKE '{patch}%'")
    if queue_id is not None:
        conditions.append(f"queue_id = {queue_id}")

    where = " AND ".join(conditions)

    sql = (  # noqa: S608
        f"SELECT champion_id, champion_name, "
        f"count() AS games_played, sum(win) AS wins, "
        f"avg(kills) AS avg_kills, avg(deaths) AS avg_deaths, "
        f"avg(assists) AS avg_assists, "
        f"avg(cs / (game_duration / 60.0)) AS avg_cs_per_min, "
        f"avg(vision_score) AS avg_vision_score, "
        f"max(game_start) AS last_played "
        f"FROM matches WHERE {where} "
        f"GROUP BY champion_id, champion_name "
        f"ORDER BY games_played DESC"
    )
    rows = ch.query(sql)

    if not rows:
        return {
            "user_id": str(user_id),
            "champions": [],
            "total_champions": 0,
        }

    # Compute pool-level min/max for normalization
    all_games = [r["games_played"] for r in rows]
    all_kda = []
    for r in rows:
        deaths = max(1.0, float(r["avg_deaths"]))
        kda = (float(r["avg_kills"]) + float(r["avg_assists"])) / deaths
        all_kda.append(kda)
    all_cs = [float(r["avg_cs_per_min"]) for r in rows]
    all_vision = [float(r["avg_vision_score"]) for r in rows]

    pool_stats = {
        "games_min": min(all_games),
        "games_max": max(all_games),
        "kda_min": min(all_kda),
        "kda_max": max(all_kda),
        "cs_min": min(all_cs),
        "cs_max": max(all_cs),
        "vision_min": min(all_vision),
        "vision_max": max(all_vision),
    }

    now = datetime.now(UTC)
    champions = []

    for row in rows:
        games = int(row["games_played"])
        wins = int(row["wins"])
        losses = games - wins
        win_rate = wins / games if games > 0 else 0.0

        deaths = max(1.0, float(row["avg_deaths"]))
        avg_kda = (float(row["avg_kills"]) + float(row["avg_assists"])) / deaths

        last_played = row.get("last_played")
        if last_played and hasattr(last_played, "timestamp"):
            days_since = (now - last_played.replace(tzinfo=UTC)).total_seconds() / 86400
        else:
            days_since = 30.0

        true_mastery = compute_true_mastery(
            games_played=games,
            win_rate=win_rate,
            avg_kda=avg_kda,
            avg_cs_per_min=float(row["avg_cs_per_min"]),
            avg_vision_score=float(row["avg_vision_score"]),
            days_since_last_played=days_since,
            pool_stats=pool_stats,
        )

        # Recent form: use overall win_rate as proxy (full recent form needs
        # per-champion last-20-game query which is done in batch jobs)
        recent_form = compute_recent_form(win_rate, min(1.0, avg_kda / 5.0))
        comfort = compute_comfort(true_mastery, recent_form)

        # Cache comfort for draft engine
        for puuid in puuids:
            cache_key = f"score:comfort:{puuid}:{row['champion_id']}"
            await cache_set(cache_key, comfort, ttl_seconds=3600)

        champions.append(
            {
                "champion_id": int(row["champion_id"]),
                "champion_name": str(row["champion_name"]),
                "games_played": games,
                "wins": wins,
                "losses": losses,
                "win_rate": round(win_rate, 4),
                "avg_kills": round(float(row["avg_kills"]), 2),
                "avg_deaths": round(float(row["avg_deaths"]), 2),
                "avg_assists": round(float(row["avg_assists"]), 2),
                "avg_kda": round(avg_kda, 2),
                "avg_cs_per_min": round(float(row["avg_cs_per_min"]), 2),
                "avg_vision_score": round(float(row["avg_vision_score"]), 2),
                "true_mastery": round(true_mastery, 2),
                "comfort_score": round(comfort, 2),
                "tier": assign_tier(true_mastery),
            }
        )

    return {
        "user_id": str(user_id),
        "champions": champions,
        "total_champions": len(champions),
    }


async def get_performance(
    db: AsyncSession,
    user_id: UUID,
) -> dict[str, Any]:
    """Aggregate performance stats across all linked accounts."""
    puuids = await _get_puuids_for_user(db, user_id)
    puuid_filter = _build_puuid_filter(puuids)

    # Overall stats
    stats_sql = (  # noqa: S608
        f"SELECT count() AS total_games, sum(win) AS total_wins, "
        f"avg(kills) AS avg_kills, avg(deaths) AS avg_deaths, "
        f"avg(assists) AS avg_assists, "
        f"avg(cs / (game_duration / 60.0)) AS avg_cs_per_min, "
        f"avg(vision_score) AS avg_vision_score "
        f"FROM matches WHERE {puuid_filter}"
    )
    stats_rows = ch.query(stats_sql)

    if not stats_rows or stats_rows[0]["total_games"] == 0:
        return {
            "user_id": str(user_id),
            "total_games": 0,
            "total_wins": 0,
            "total_losses": 0,
            "overall_win_rate": 0.0,
            "avg_kills": 0.0,
            "avg_deaths": 0.0,
            "avg_assists": 0.0,
            "avg_kda": 0.0,
            "avg_cs_per_min": 0.0,
            "avg_vision_score": 0.0,
            "role_distribution": [],
            "top_champions": [],
        }

    s = stats_rows[0]
    total_games = int(s["total_games"])
    total_wins = int(s["total_wins"])
    avg_deaths = max(1.0, float(s["avg_deaths"]))
    avg_kda = (float(s["avg_kills"]) + float(s["avg_assists"])) / avg_deaths

    # Role distribution
    role_sql = (  # noqa: S608
        f"SELECT role, count() AS games FROM matches "
        f"WHERE {puuid_filter} GROUP BY role ORDER BY games DESC"
    )
    role_rows = ch.query(role_sql)

    role_dist = [
        {
            "role": str(r["role"]),
            "games": int(r["games"]),
            "percentage": round(int(r["games"]) / total_games * 100, 2),
        }
        for r in role_rows
    ]

    # Top champions
    top_sql = (  # noqa: S608
        f"SELECT champion_id, champion_name, "
        f"count() AS games_played, sum(win) / count() AS win_rate "
        f"FROM matches WHERE {puuid_filter} "
        f"GROUP BY champion_id, champion_name "
        f"ORDER BY games_played DESC LIMIT 5"
    )
    top_rows = ch.query(top_sql)

    top_champs = [
        {
            "champion_id": int(r["champion_id"]),
            "champion_name": str(r["champion_name"]),
            "games_played": int(r["games_played"]),
            "win_rate": round(float(r["win_rate"]), 4),
        }
        for r in top_rows
    ]

    return {
        "user_id": str(user_id),
        "total_games": total_games,
        "total_wins": total_wins,
        "total_losses": total_games - total_wins,
        "overall_win_rate": round(total_wins / total_games, 4),
        "avg_kills": round(float(s["avg_kills"]), 2),
        "avg_deaths": round(float(s["avg_deaths"]), 2),
        "avg_assists": round(float(s["avg_assists"]), 2),
        "avg_kda": round(avg_kda, 2),
        "avg_cs_per_min": round(float(s["avg_cs_per_min"]), 2),
        "avg_vision_score": round(float(s["avg_vision_score"]), 2),
        "role_distribution": role_dist,
        "top_champions": top_champs,
    }


async def get_gold_diff(match_id: str) -> dict[str, Any]:
    """Get gold diff timeline for all participants in a match."""
    rows = ch.query(
        """
        SELECT puuid, champion_name, team_id, gold_diff_timeline
        FROM matches
        WHERE match_id = %(match_id)s
        """,
        {"match_id": match_id},
    )

    if not rows:
        raise NotFoundError(f"Match not found: {match_id}")

    participants = []
    for row in rows:
        timeline_str = row.get("gold_diff_timeline", "[]")
        try:
            timeline_data = json.loads(timeline_str)
        except (json.JSONDecodeError, TypeError):
            timeline_data = []

        timeline = [{"minute": i, "gold_diff": v} for i, v in enumerate(timeline_data)]

        participants.append(
            {
                "puuid": str(row["puuid"]),
                "champion_name": str(row["champion_name"]),
                "team_id": int(row["team_id"]),
                "timeline": timeline,
            }
        )

    return {
        "match_id": match_id,
        "participants": participants,
    }
