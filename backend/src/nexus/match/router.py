"""FastAPI router for match ingestion and match history."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from nexus.match import schemas
from nexus.match.ingestion import ingest_matches
from nexus.middleware.auth import get_optional_user
from nexus.shared import clickhouse as ch
from nexus.shared.pagination import paginated_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/match", tags=["match"])

# Track inline ingestion results (for status polling without Redis)
_inline_results: dict[str, dict[str, Any]] = {}


@router.post("/ingest/{puuid}", response_model=schemas.IngestResponse)
async def trigger_ingestion(
    puuid: str,
    body: schemas.IngestRequest | None = None,
    current_user: dict[str, Any] | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """Trigger match history ingestion for a PUUID.

    Runs ingestion inline (synchronously) when arq/Redis is unavailable,
    or enqueues a background job when arq is available.
    """
    if body is None:
        body = schemas.IngestRequest()

    # Try arq first, fall back to inline ingestion
    try:
        from arq.connections import ArqRedis

        from nexus.dependencies import get_arq_pool
        from nexus.match.tasks import enqueue_ingestion as enqueue

        arq_pool: ArqRedis = await get_arq_pool()
        job = await enqueue(
            arq_pool,
            puuid=puuid,
            region=body.region,
            queue_ids=body.queue_ids,
            count=body.count,
        )
        return {
            "puuid": puuid,
            "job_id": job.job_id,
            "matches_fetched": 0,
            "matches_inserted": 0,
            "status": "queued",
        }
    except Exception:
        logger.info("arq unavailable, running ingestion inline for %s", puuid)

    # Inline ingestion
    job_id = str(uuid.uuid4())
    _inline_results[job_id] = {"status": "in_progress"}

    try:
        result = await ingest_matches(
            puuid=puuid,
            region=body.region,
            queue_ids=body.queue_ids,
            count=body.count,
        )
        fetched = result.get("matches_fetched", 0) if isinstance(result, dict) else 0
        inserted = result.get("matches_inserted", 0) if isinstance(result, dict) else 0
        _inline_results[job_id] = {
            "status": "complete",
            "matches_fetched": fetched,
            "matches_inserted": inserted,
        }
        return {
            "puuid": puuid,
            "job_id": job_id,
            "matches_fetched": fetched,
            "matches_inserted": inserted,
            "status": "complete",
        }
    except Exception as exc:
        logger.exception("Inline ingestion failed for %s", puuid)
        error_msg = f"{type(exc).__name__}: {exc}"
        _inline_results[job_id] = {
            "status": "complete",
            "matches_fetched": 0,
            "matches_inserted": 0,
            "error": error_msg,
        }
        return {
            "puuid": puuid,
            "job_id": job_id,
            "matches_fetched": 0,
            "matches_inserted": 0,
            "status": "complete",
            "error": error_msg,
        }


@router.get(
    "/ingest/status/{job_id}",
    response_model=schemas.IngestStatusResponse,
)
async def get_ingest_status(job_id: str) -> dict[str, Any]:
    """Check the status of an ingestion job by job ID."""
    # Check inline results first
    if job_id in _inline_results:
        info = _inline_results[job_id]
        return {
            "job_id": job_id,
            "status": info.get("status", "complete"),
            "matches_fetched": info.get("matches_fetched"),
            "matches_inserted": info.get("matches_inserted"),
        }

    # Try arq/Redis
    try:
        from arq.jobs import Job

        from nexus.dependencies import get_arq_pool

        arq_pool = await get_arq_pool()
        job = Job(job_id, redis=arq_pool)
        status = await job.status()

        status_map = {
            "deferred": "queued",
            "queued": "queued",
            "in_progress": "in_progress",
            "complete": "complete",
            "not_found": "not_found",
        }
        mapped = status_map.get(status.value, "not_found")

        result: dict[str, Any] = {"job_id": job_id, "status": mapped}
        if mapped == "complete":
            try:
                job_result = await job.result(timeout=1)
                if isinstance(job_result, dict):
                    result["matches_fetched"] = job_result.get("matches_fetched")
                    result["matches_inserted"] = job_result.get("matches_inserted")
            except Exception:
                logger.debug("Could not retrieve result for job %s", job_id)

        return result
    except Exception:
        return {"job_id": job_id, "status": "not_found"}


@router.get("/detail/{match_id}", response_model=schemas.MatchDetailResponse)
async def get_match_detail(match_id: str) -> dict[str, Any]:
    """Get detailed match data with all 10 participants grouped by team."""
    sql = (  # noqa: S608
        "SELECT match_id, game_duration, game_start, queue_id, puuid,"
        " champion_id, champion_name, team_id, role, kills, deaths, assists,"
        " cs, gold_earned, damage_dealt, vision_score, win, items,"
        " game_name, tag_line"
        " FROM matches FINAL WHERE match_id = %(match_id)s"
    )
    params: dict[str, Any] = {"match_id": match_id}

    loop = asyncio.get_running_loop()
    rows = await loop.run_in_executor(None, ch.query, sql, params)

    if not rows:
        raise HTTPException(status_code=404, detail="Match not found")

    first = rows[0]
    blue_participants: list[dict[str, Any]] = []
    red_participants: list[dict[str, Any]] = []

    for row in rows:
        duration_min = max(first.get("game_duration", 1), 1) / 60
        items_raw = row.get("items", "")
        detail_items: list[int] = []
        if items_raw:
            try:
                detail_items = json.loads(items_raw)
            except (json.JSONDecodeError, TypeError):
                detail_items = []

        participant = {
            "champion_id": row.get("champion_id", 0),
            "champion_name": row.get("champion_name", ""),
            "role": row.get("role", ""),
            "game_name": row.get("game_name", ""),
            "tag_line": row.get("tag_line", ""),
            "kills": row.get("kills", 0),
            "deaths": row.get("deaths", 0),
            "assists": row.get("assists", 0),
            "cs_per_min": round(row.get("cs", 0) / duration_min, 1),
            "gold_earned": row.get("gold_earned", 0),
            "total_damage_dealt": row.get("damage_dealt", 0),
            "vision_score": row.get("vision_score", 0),
            "win": bool(row.get("win", 0)),
            "items": detail_items,
        }
        if row.get("team_id", 0) == 100:
            blue_participants.append(participant)
        else:
            red_participants.append(participant)

    blue_win = bool(blue_participants[0]["win"]) if blue_participants else False
    red_win = bool(red_participants[0]["win"]) if red_participants else False

    return {
        "match_id": match_id,
        "game_duration": first.get("game_duration", 0),
        "game_start": first.get("game_start", ""),
        "queue_id": first.get("queue_id", 0),
        "blue_team": {
            "team_id": 100,
            "win": blue_win,
            "participants": blue_participants,
        },
        "red_team": {
            "team_id": 200,
            "win": red_win,
            "participants": red_participants,
        },
    }


@router.get("/history/{puuid}", response_model=schemas.MatchHistoryResponse)
async def get_match_history(
    puuid: str,
    queue_id: int | None = Query(default=None, alias="queue"),
    champion_id: int | None = Query(default=None),
    champion: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=150),
    current_user: dict[str, Any] | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """Get paginated match history from ClickHouse.

    Supports filtering by queue_id, champion_id or champion name, and
    date range.  Uses cursor-based pagination (cursor is a game_start
    timestamp).
    """
    conditions = ["puuid = %(puuid)s"]
    params: dict[str, Any] = {"puuid": puuid, "limit": limit + 1}

    if queue_id is not None:
        conditions.append("queue_id = %(queue_id)s")
        params["queue_id"] = queue_id

    if champion_id is not None:
        conditions.append("champion_id = %(champion_id)s")
        params["champion_id"] = champion_id
    elif champion is not None:
        conditions.append("champion_name ILIKE %(champion)s")
        params["champion"] = f"%{champion}%"

    if start_date is not None:
        conditions.append("game_start >= %(start_date)s")
        params["start_date"] = start_date

    if end_date is not None:
        conditions.append("game_start <= %(end_date)s")
        params["end_date"] = end_date

    if cursor is not None:
        conditions.append("game_start < %(cursor)s")
        params["cursor"] = cursor

    where = " AND ".join(conditions)
    sql = (  # noqa: S608
        f"SELECT * FROM matches FINAL WHERE {where} ORDER BY game_start DESC LIMIT %(limit)s"
    )

    loop = asyncio.get_running_loop()
    rows = await loop.run_in_executor(None, ch.query, sql, params)

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    next_cursor = None
    if has_more and rows:
        last_start = rows[-1].get("game_start")
        if last_start is not None:
            next_cursor = str(last_start)

    data = []
    for row in rows:
        items_raw = row.get("items", "")
        items: list[int] = []
        if items_raw:
            try:
                items = json.loads(items_raw)
            except (json.JSONDecodeError, TypeError):
                items = []

        data.append(
            schemas.MatchParticipant(
                match_id=row.get("match_id", ""),
                platform_id=row.get("platform_id", ""),
                queue_id=row.get("queue_id", 0),
                game_version=row.get("game_version", ""),
                game_duration=row.get("game_duration", 0),
                game_start=row.get("game_start", ""),
                puuid=row.get("puuid", "")[:8],
                champion_id=row.get("champion_id", 0),
                champion_name=row.get("champion_name", ""),
                team_id=row.get("team_id", 0),
                role=row.get("role", ""),
                win=bool(row.get("win", 0)),
                kills=row.get("kills", 0),
                deaths=row.get("deaths", 0),
                assists=row.get("assists", 0),
                cs=row.get("cs", 0),
                gold_earned=row.get("gold_earned", 0),
                damage_dealt=row.get("damage_dealt", 0),
                damage_taken=row.get("damage_taken", 0),
                vision_score=row.get("vision_score", 0),
                items=items,
            ).model_dump()
        )

    return paginated_response(
        data,
        cursor=next_cursor,
        has_more=has_more,
    )
