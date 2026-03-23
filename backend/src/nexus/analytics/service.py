"""Analytics service: champion pool analysis and performance aggregation."""

from __future__ import annotations

import asyncio
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


def _run_ch_query(sql: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Run a ClickHouse query (sync wrapper for use with run_in_executor)."""
    return ch.query(sql, parameters)


async def _async_ch_query(
    sql: str, parameters: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    """Run a ClickHouse query without blocking the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _run_ch_query, sql, parameters)


async def _fetch_recent_games(
    puuids: list[str],
    champion_id: int,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Fetch the most recent N games for a champion across PUUIDs."""
    sql = """
        SELECT win, kills, deaths, assists
        FROM matches FINAL
        WHERE puuid IN %(puuids)s AND champion_id = %(champion_id)s
        ORDER BY game_start DESC
        LIMIT %(limit)s
    """
    return await _async_ch_query(
        sql,
        {"puuids": puuids, "champion_id": champion_id, "limit": limit},
    )


async def get_champion_pool(
    db: AsyncSession,
    user_id: UUID,
    *,
    patch: str | None = None,
    queue_id: int | None = None,
    role: str | None = None,
    sort_by: str = "games_played",
    sort_order: str = "desc",
) -> dict[str, Any]:
    """Compute champion pool with True Mastery and Comfort scores."""
    puuids = await _get_puuids_for_user(db, user_id)

    conditions = ["puuid IN %(puuids)s"]
    params: dict[str, Any] = {"puuids": puuids}

    if patch is not None:
        conditions.append("game_version LIKE %(patch)s")
        params["patch"] = f"{patch}%"
    if queue_id is not None:
        conditions.append("queue_id = %(queue_id)s")
        params["queue_id"] = queue_id
    if role is not None:
        conditions.append("role = %(role)s")
        params["role"] = role.upper()

    where = " AND ".join(conditions)

    sql = (
        f"SELECT champion_id, champion_name, "
        f"count() AS games_played, sum(win) AS wins, "
        f"avg(kills) AS avg_kills, avg(deaths) AS avg_deaths, "
        f"avg(assists) AS avg_assists, "
        f"avg(cs / (greatest(game_duration, 1) / 60.0)) AS avg_cs_per_min, "
        f"avg(vision_score) AS avg_vision_score, "
        f"max(game_start) AS last_played "
        f"FROM matches FINAL WHERE {where} "
        f"GROUP BY champion_id, champion_name "
        f"ORDER BY games_played DESC"
    )
    rows = await _async_ch_query(sql, params)

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

        # Fetch last 20 games for this champion to compute proper RecentForm
        champion_id = int(row["champion_id"])
        recent_rows = await _fetch_recent_games(puuids, champion_id, limit=20)

        if recent_rows:
            recent_wins = sum(int(r["win"]) for r in recent_rows)
            recent_total = len(recent_rows)
            win_rate_last_20 = recent_wins / recent_total

            recent_kdas = []
            for rr in recent_rows:
                d = max(1.0, float(rr["deaths"]))
                recent_kdas.append((float(rr["kills"]) + float(rr["assists"])) / d)
            # kda_trend: normalized difference between recent avg KDA and
            # overall avg KDA — clamped to [0, 1]
            recent_avg_kda = sum(recent_kdas) / len(recent_kdas)
            kda_trend_norm = max(0.0, min(1.0, (recent_avg_kda - avg_kda + 5.0) / 10.0))
        else:
            win_rate_last_20 = win_rate
            kda_trend_norm = min(1.0, avg_kda / 5.0)

        recent_form = compute_recent_form(win_rate_last_20, kda_trend_norm)
        comfort = compute_comfort(true_mastery, recent_form)

        # Cache comfort per PUUID for draft engine (key per CLAUDE.md)
        for puuid in puuids:
            cache_key = f"score:comfort:{puuid}:{champion_id}"
            await cache_set(cache_key, comfort, ttl_seconds=3600)

        champions.append(
            {
                "champion_id": champion_id,
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

    # Sort results
    reverse = sort_order == "desc"
    if sort_by in ("games_played", "win_rate", "true_mastery", "comfort_score"):
        champions.sort(key=lambda c: c[sort_by], reverse=reverse)

    return {
        "user_id": str(user_id),
        "champions": champions,
        "total_champions": len(champions),
    }


async def get_champion_pool_by_puuid(
    puuid: str,
    *,
    patch: str | None = None,
    queue_id: int | None = None,
    role: str | None = None,
    sort_by: str = "games_played",
    sort_order: str = "desc",
) -> dict[str, Any]:
    """Compute champion pool for a single PUUID (public lookup use-case)."""
    # Reuse the same ClickHouse-backed computation, just scoped to one PUUID.
    puuids = [puuid]

    conditions = ["puuid IN %(puuids)s"]
    params: dict[str, Any] = {"puuids": puuids}

    if patch is not None:
        conditions.append("game_version LIKE %(patch)s")
        params["patch"] = f"{patch}%"
    if queue_id is not None:
        conditions.append("queue_id = %(queue_id)s")
        params["queue_id"] = queue_id
    if role is not None:
        conditions.append("role = %(role)s")
        params["role"] = role.upper()

    where = " AND ".join(conditions)

    sql = (
        f"SELECT champion_id, champion_name, "
        f"count() AS games_played, sum(win) AS wins, "
        f"avg(kills) AS avg_kills, avg(deaths) AS avg_deaths, "
        f"avg(assists) AS avg_assists, "
        f"avg(cs / (greatest(game_duration, 1) / 60.0)) AS avg_cs_per_min, "
        f"avg(vision_score) AS avg_vision_score, "
        f"max(game_start) AS last_played "
        f"FROM matches FINAL WHERE {where} "
        f"GROUP BY champion_id, champion_name "
        f"ORDER BY games_played DESC"
    )
    rows = await _async_ch_query(sql, params)

    if not rows:
        return {
            "user_id": puuid,
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

        champion_id = int(row["champion_id"])
        recent_rows = await _fetch_recent_games(puuids, champion_id, limit=20)

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

        cache_key = f"score:comfort:{puuid}:{champion_id}"
        await cache_set(cache_key, comfort, ttl_seconds=3600)

        champions.append(
            {
                "champion_id": champion_id,
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

    reverse = sort_order == "desc"
    if sort_by in ("games_played", "win_rate", "true_mastery", "comfort_score"):
        champions.sort(key=lambda c: c[sort_by], reverse=reverse)

    return {
        "user_id": puuid,
        "champions": champions,
        "total_champions": len(champions),
    }


async def get_performance(
    db: AsyncSession,
    user_id: UUID,
) -> dict[str, Any]:
    """Aggregate performance stats across all linked accounts."""
    puuids = await _get_puuids_for_user(db, user_id)
    params: dict[str, Any] = {"puuids": puuids}

    # Overall stats
    stats_sql = (
        "SELECT count() AS total_games, sum(win) AS total_wins, "
        "avg(kills) AS avg_kills, avg(deaths) AS avg_deaths, "
        "avg(assists) AS avg_assists, "
        "avg(cs / (greatest(game_duration, 1) / 60.0)) AS avg_cs_per_min, "
        "avg(vision_score) AS avg_vision_score "
        "FROM matches FINAL WHERE puuid IN %(puuids)s"
    )
    stats_rows = await _async_ch_query(stats_sql, params)

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
    role_sql = (
        "SELECT role, count() AS games FROM matches FINAL "
        "WHERE puuid IN %(puuids)s GROUP BY role ORDER BY games DESC"
    )
    role_rows = await _async_ch_query(role_sql, params)

    role_dist = [
        {
            "role": str(r["role"]),
            "games": int(r["games"]),
            "percentage": round(int(r["games"]) / total_games * 100, 2),
        }
        for r in role_rows
    ]

    # Top champions
    top_sql = (
        "SELECT champion_id, champion_name, "
        "count() AS games_played, "
        "sum(win) * 1.0 / count() AS win_rate "
        "FROM matches FINAL WHERE puuid IN %(puuids)s "
        "GROUP BY champion_id, champion_name "
        "ORDER BY games_played DESC LIMIT 5"
    )
    top_rows = await _async_ch_query(top_sql, params)

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


async def get_performance_by_puuid(puuid: str) -> dict[str, Any]:
    """Aggregate performance stats for a single PUUID (public lookup use-case)."""
    empty_response: dict[str, Any] = {
        "user_id": puuid,
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

    params: dict[str, Any] = {"puuids": [puuid]}

    try:
        stats_sql = (
            "SELECT count() AS total_games, sum(win) AS total_wins, "
            "avg(kills) AS avg_kills, avg(deaths) AS avg_deaths, "
            "avg(assists) AS avg_assists, "
            "avg(cs / (greatest(game_duration, 1) / 60.0)) AS avg_cs_per_min, "
            "avg(vision_score) AS avg_vision_score "
            "FROM matches FINAL WHERE puuid IN %(puuids)s"
        )
        stats_rows = await _async_ch_query(stats_sql, params)
    except Exception:
        logger.exception("get_performance_by_puuid: stats query failed for %s", puuid)
        return empty_response

    if not stats_rows or int(stats_rows[0]["total_games"]) == 0:
        return empty_response

    s = stats_rows[0]
    total_games = int(s["total_games"])
    total_wins = int(s["total_wins"])
    avg_deaths = max(1.0, float(s["avg_deaths"]))
    avg_kda = (float(s["avg_kills"]) + float(s["avg_assists"])) / avg_deaths

    try:
        role_sql = (
            "SELECT role, count() AS games FROM matches FINAL "
            "WHERE puuid IN %(puuids)s GROUP BY role ORDER BY games DESC"
        )
        role_rows = await _async_ch_query(role_sql, params)
    except Exception:
        logger.exception("get_performance_by_puuid: role query failed for %s", puuid)
        role_rows = []

    role_dist = [
        {
            "role": str(r["role"]),
            "games": int(r["games"]),
            "percentage": round(int(r["games"]) / total_games * 100, 2),
        }
        for r in role_rows
    ]

    try:
        top_sql = (
            "SELECT champion_id, champion_name, "
            "count() AS games_played, "
            "sum(win) * 1.0 / count() AS win_rate "
            "FROM matches FINAL WHERE puuid IN %(puuids)s "
            "GROUP BY champion_id, champion_name "
            "ORDER BY games_played DESC LIMIT 5"
        )
        top_rows = await _async_ch_query(top_sql, params)
    except Exception:
        logger.exception("get_performance_by_puuid: top champs query failed for %s", puuid)
        top_rows = []

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
        "user_id": puuid,
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
    rows = await _async_ch_query(
        "SELECT puuid, champion_name, team_id, gold_diff_timeline "
        "FROM matches FINAL WHERE match_id = %(match_id)s",
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


async def get_duo_overlap(puuid1: str, puuid2: str) -> dict[str, Any]:
    """Compare champion pools of two players and find overlap."""
    pool1 = await get_champion_pool_by_puuid(
        puuid1, sort_by="true_mastery", sort_order="desc"
    )
    pool2 = await get_champion_pool_by_puuid(
        puuid2, sort_by="true_mastery", sort_order="desc"
    )

    p1_map = {c["champion_id"]: c for c in pool1["champions"]}
    p2_map = {c["champion_id"]: c for c in pool2["champions"]}

    shared_ids = set(p1_map.keys()) & set(p2_map.keys())
    p1_only = set(p1_map.keys()) - shared_ids
    p2_only = set(p2_map.keys()) - shared_ids

    shared_champions = []
    for cid in shared_ids:
        c1, c2 = p1_map[cid], p2_map[cid]
        shared_champions.append(
            {
                "champion_id": cid,
                "champion_name": c1["champion_name"],
                "player1_mastery": c1["true_mastery"],
                "player2_mastery": c2["true_mastery"],
                "avg_mastery": round(
                    (c1["true_mastery"] + c2["true_mastery"]) / 2, 2
                ),
                "player1_comfort": c1["comfort_score"],
                "player2_comfort": c2["comfort_score"],
                "player1_tier": c1["tier"],
                "player2_tier": c2["tier"],
            }
        )
    shared_champions.sort(key=lambda x: x["avg_mastery"], reverse=True)

    # Top 10 exclusive champs per player, sorted by mastery
    p1_exclusive = sorted(
        [p1_map[cid] for cid in p1_only],
        key=lambda c: c["true_mastery"],
        reverse=True,
    )[:10]
    p2_exclusive = sorted(
        [p2_map[cid] for cid in p2_only],
        key=lambda c: c["true_mastery"],
        reverse=True,
    )[:10]

    union_size = len(p1_map.keys() | p2_map.keys())
    overlap_pct = round(len(shared_ids) / max(1, union_size) * 100, 1)

    return {
        "player1_puuid": puuid1,
        "player2_puuid": puuid2,
        "player1_total": pool1["total_champions"],
        "player2_total": pool2["total_champions"],
        "shared_count": len(shared_ids),
        "player1_exclusive_count": len(p1_only),
        "player2_exclusive_count": len(p2_only),
        "shared_champions": shared_champions,
        "player1_exclusive": p1_exclusive,
        "player2_exclusive": p2_exclusive,
        "overlap_percentage": overlap_pct,
    }


async def get_champion_recent_games(
    puuid: str, *, limit_per_champ: int = 10
) -> dict[str, Any]:
    """Get recent win/loss results per champion for sparkline display."""
    sql = """
        SELECT champion_id, champion_name, win, game_start
        FROM (
            SELECT champion_id, champion_name, win, game_start,
                   row_number() OVER (
                       PARTITION BY champion_id ORDER BY game_start DESC
                   ) AS rn
            FROM matches FINAL
            WHERE puuid = %(puuid)s
        )
        WHERE rn <= %(limit)s
        ORDER BY champion_id, game_start ASC
    """
    rows = await _async_ch_query(sql, {"puuid": puuid, "limit": limit_per_champ})

    trends: dict[int, dict[str, Any]] = {}
    for row in rows:
        cid = int(row["champion_id"])
        if cid not in trends:
            trends[cid] = {
                "champion_id": cid,
                "champion_name": str(row["champion_name"]),
                "recent_games": [],
            }
        game_start = row["game_start"]
        if hasattr(game_start, "isoformat"):
            game_start = game_start.isoformat()
        trends[cid]["recent_games"].append(
            {"win": bool(row["win"]), "game_start": str(game_start)}
        )

    return {"puuid": puuid, "trends": list(trends.values())}


async def get_head_to_head(
    puuid1: str, puuid2: str, *, limit: int = 20
) -> dict[str, Any]:
    """Find shared matches between two players and compute head-to-head stats."""
    # Step 1: Find match IDs where both players participated
    shared_sql = """
        SELECT match_id
        FROM matches FINAL
        WHERE puuid IN %(puuids)s
        GROUP BY match_id
        HAVING count(DISTINCT puuid) = 2
        ORDER BY max(game_start) DESC
        LIMIT %(limit)s
    """
    shared_rows = await _async_ch_query(
        shared_sql, {"puuids": [puuid1, puuid2], "limit": limit}
    )

    if not shared_rows:
        return {
            "puuid1": puuid1,
            "puuid2": puuid2,
            "total_games": 0,
            "same_team_games": 0,
            "opposite_team_games": 0,
            "p1_wins_vs": 0,
            "p2_wins_vs": 0,
            "matches": [],
        }

    match_ids = [str(r["match_id"]) for r in shared_rows]

    # Step 2: Fetch participant details for those matches
    detail_sql = """
        SELECT match_id, puuid, champion_id, champion_name, role,
               team_id, win, kills, deaths, assists,
               game_start, game_duration, queue_id
        FROM matches FINAL
        WHERE match_id IN %(match_ids)s AND puuid IN %(puuids)s
        ORDER BY game_start DESC
    """
    detail_rows = await _async_ch_query(
        detail_sql, {"match_ids": match_ids, "puuids": [puuid1, puuid2]}
    )

    # Group by match_id
    by_match: dict[str, list[dict[str, Any]]] = {}
    for row in detail_rows:
        mid = str(row["match_id"])
        by_match.setdefault(mid, []).append(row)

    matches = []
    same_team_count = 0
    opposite_team_count = 0
    p1_wins_vs = 0
    p2_wins_vs = 0

    for mid, participants in by_match.items():
        p1_data = next((p for p in participants if str(p["puuid"]) == puuid1), None)
        p2_data = next((p for p in participants if str(p["puuid"]) == puuid2), None)
        if not p1_data or not p2_data:
            continue

        same_team = int(p1_data["team_id"]) == int(p2_data["team_id"])
        if same_team:
            same_team_count += 1
        else:
            opposite_team_count += 1
            if bool(p1_data["win"]):
                p1_wins_vs += 1
            else:
                p2_wins_vs += 1

        game_start = p1_data["game_start"]
        if hasattr(game_start, "isoformat"):
            game_start = game_start.isoformat()

        def _player(data: dict[str, Any]) -> dict[str, Any]:
            return {
                "puuid": str(data["puuid"]),
                "champion_id": int(data["champion_id"]),
                "champion_name": str(data["champion_name"]),
                "role": str(data["role"]),
                "win": bool(data["win"]),
                "kills": int(data["kills"]),
                "deaths": int(data["deaths"]),
                "assists": int(data["assists"]),
            }

        matches.append({
            "match_id": mid,
            "game_start": str(game_start),
            "game_duration": int(p1_data["game_duration"]),
            "queue_id": int(p1_data["queue_id"]),
            "player1": _player(p1_data),
            "player2": _player(p2_data),
            "same_team": same_team,
        })

    return {
        "puuid1": puuid1,
        "puuid2": puuid2,
        "total_games": len(matches),
        "same_team_games": same_team_count,
        "opposite_team_games": opposite_team_count,
        "p1_wins_vs": p1_wins_vs,
        "p2_wins_vs": p2_wins_vs,
        "matches": matches,
    }
