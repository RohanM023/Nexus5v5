"""arq job function for nightly batch analytics refresh (E4-T10).

Recomputes True Mastery and Comfort scores for all active users
and warms the Redis cache so draft-time reads are fast.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any
from uuid import UUID

import structlog
from prometheus_client import Counter, Histogram
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from nexus.analytics.metrics import (
    compute_comfort,
    compute_recent_form,
    compute_true_mastery,
)
from nexus.identity.models import RiotAccount, User
from nexus.shared import clickhouse as ch
from nexus.shared.database import get_session_factory
from nexus.shared.redis import cache_set

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------
BATCH_USERS_PROCESSED = Counter(
    "nexus_batch_analytics_users_processed_total",
    "Total users processed by the nightly batch analytics refresh",
)
BATCH_CHAMPIONS_REFRESHED = Counter(
    "nexus_batch_analytics_champions_refreshed_total",
    "Total champion-score entries refreshed in Redis",
)
BATCH_ERRORS = Counter(
    "nexus_batch_analytics_errors_total",
    "Total errors encountered during batch analytics refresh",
)
BATCH_DURATION = Histogram(
    "nexus_batch_analytics_duration_seconds",
    "Duration of the full batch analytics refresh run",
    buckets=[10, 30, 60, 120, 300, 600, 1200, 1800, 3600],
)
BATCH_USER_DURATION = Histogram(
    "nexus_batch_analytics_user_duration_seconds",
    "Duration of analytics refresh per user",
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60],
)


# ---------------------------------------------------------------------------
# ClickHouse helpers (same pattern as analytics/service.py)
# ---------------------------------------------------------------------------
def _run_ch_query(sql: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    return ch.query(sql, parameters)


async def _async_ch_query(
    sql: str, parameters: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _run_ch_query, sql, parameters)


# ---------------------------------------------------------------------------
# Core refresh logic
# ---------------------------------------------------------------------------
async def _refresh_user_scores(user_id: UUID, puuids: list[str]) -> int:
    """Recompute champion pool scores for a single user and cache in Redis.

    Returns the number of champion entries refreshed.
    """
    params: dict[str, Any] = {"puuids": puuids}

    sql = (
        "SELECT champion_id, champion_name, "
        "count() AS games_played, sum(win) AS wins, "
        "avg(kills) AS avg_kills, avg(deaths) AS avg_deaths, "
        "avg(assists) AS avg_assists, "
        "avg(cs / (greatest(game_duration, 1) / 60.0)) AS avg_cs_per_min, "
        "avg(vision_score) AS avg_vision_score, "
        "max(game_start) AS last_played "
        "FROM matches FINAL WHERE puuid IN %(puuids)s "
        "GROUP BY champion_id, champion_name "
        "ORDER BY games_played DESC"
    )
    rows = await _async_ch_query(sql, params)

    if not rows:
        return 0

    # Build pool-level min/max for normalization
    from datetime import UTC, datetime

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
    refreshed = 0

    for row in rows:
        games = int(row["games_played"])
        wins = int(row["wins"])
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

        # Fetch recent games for RecentForm
        champion_id = int(row["champion_id"])
        recent_sql = (
            "SELECT win, kills, deaths, assists "
            "FROM matches FINAL "
            "WHERE puuid IN %(puuids)s AND champion_id = %(champion_id)s "
            "ORDER BY game_start DESC "
            "LIMIT 20"
        )
        recent_rows = await _async_ch_query(
            recent_sql,
            {"puuids": puuids, "champion_id": champion_id},
        )

        if recent_rows:
            recent_wins = sum(int(r["win"]) for r in recent_rows)
            recent_total = len(recent_rows)
            win_rate_last_20 = recent_wins / recent_total

            recent_kdas = []
            for rr in recent_rows:
                d = max(1.0, float(rr["deaths"]))
                recent_kdas.append((float(rr["kills"]) + float(rr["assists"])) / d)
            recent_avg_kda = sum(recent_kdas) / len(recent_kdas)
            kda_trend_norm = max(0.0, min(1.0, (recent_avg_kda - avg_kda + 5.0) / 10.0))
        else:
            win_rate_last_20 = win_rate
            kda_trend_norm = min(1.0, avg_kda / 5.0)

        recent_form = compute_recent_form(win_rate_last_20, kda_trend_norm)
        comfort = compute_comfort(true_mastery, recent_form)
        # Cache comfort score per PUUID (key pattern from CLAUDE.md)
        for puuid in puuids:
            cache_key = f"score:comfort:{puuid}:{champion_id}"
            await cache_set(cache_key, comfort, ttl_seconds=3600)

        refreshed += 1

    BATCH_CHAMPIONS_REFRESHED.inc(refreshed)
    return refreshed


# ---------------------------------------------------------------------------
# arq entry-point
# ---------------------------------------------------------------------------
async def run_batch_analytics_refresh(ctx: dict[str, Any]) -> dict[str, Any]:
    """arq cron job: recompute True Mastery / Comfort scores for all users.

    Scheduled nightly at 04:00 UTC via arq cron_jobs.
    """
    log = logger.bind(job="batch_analytics_refresh")
    log.info("batch_analytics_refresh.started")
    start = time.monotonic()

    session_factory = get_session_factory()
    users_processed = 0
    users_skipped = 0
    total_champions = 0
    errors = 0

    try:
        async with session_factory() as db:
            # Fetch all users who have at least one verified riot account
            stmt = (
                select(User)
                .join(RiotAccount, RiotAccount.user_id == User.id)
                .where(RiotAccount.verified.is_(True))
                .distinct()
                .options(selectinload(User.riot_accounts))
            )
            result = await db.execute(stmt)
            users = result.scalars().all()

        log.info(
            "batch_analytics_refresh.users_found",
            user_count=len(users),
        )

        for user in users:
            user_start = time.monotonic()
            puuids = [ra.puuid for ra in user.riot_accounts]
            if not puuids:
                users_skipped += 1
                continue

            try:
                champ_count = await _refresh_user_scores(user.id, puuids)
                total_champions += champ_count
                users_processed += 1
                BATCH_USERS_PROCESSED.inc()
                BATCH_USER_DURATION.observe(time.monotonic() - user_start)
                log.debug(
                    "batch_analytics_refresh.user_done",
                    user_id=str(user.id),
                    champions=champ_count,
                )
            except Exception:
                errors += 1
                BATCH_ERRORS.inc()
                log.exception(
                    "batch_analytics_refresh.user_error",
                    user_id=str(user.id),
                )

    except Exception:
        BATCH_ERRORS.inc()
        log.exception("batch_analytics_refresh.fatal_error")
        raise

    elapsed = time.monotonic() - start
    BATCH_DURATION.observe(elapsed)

    summary = {
        "users_processed": users_processed,
        "users_skipped": users_skipped,
        "total_champions_refreshed": total_champions,
        "errors": errors,
        "duration_seconds": round(elapsed, 2),
    }
    log.info("batch_analytics_refresh.completed", **summary)
    return summary
