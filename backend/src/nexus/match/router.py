"""FastAPI router for match ingestion and match history."""

from __future__ import annotations

import logging
from typing import Any

from arq.connections import ArqRedis
from fastapi import APIRouter, Depends, Query

from nexus.dependencies import get_arq_pool
from nexus.match import schemas
from nexus.match.tasks import enqueue_ingestion
from nexus.middleware.auth import get_current_user
from nexus.shared import clickhouse as ch
from nexus.shared.pagination import paginated_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/match", tags=["match"])


@router.post("/ingest/{puuid}", response_model=schemas.IngestResponse)
async def trigger_ingestion(
    puuid: str,
    body: schemas.IngestRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    arq_pool: ArqRedis = Depends(get_arq_pool),
) -> dict[str, Any]:
    """Trigger match history ingestion for a PUUID.

    Enqueues an arq background job and returns immediately with a job ID.
    The job is idempotent -- re-triggering for the same PUUID will only
    fetch matches newer than the last watermark.
    """
    if body is None:
        body = schemas.IngestRequest()

    job = await enqueue_ingestion(
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


@router.get("/history/{puuid}")
async def get_match_history(
    puuid: str,
    queue_id: int | None = Query(default=None),
    champion_id: int | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get paginated match history from ClickHouse.

    Supports filtering by queue_id, champion_id, and date range.
    Uses cursor-based pagination (cursor is a game_start timestamp).
    """
    conditions = ["puuid = %(puuid)s"]
    params: dict[str, Any] = {"puuid": puuid, "limit": limit + 1}

    if queue_id is not None:
        conditions.append("queue_id = %(queue_id)s")
        params["queue_id"] = queue_id

    if champion_id is not None:
        conditions.append("champion_id = %(champion_id)s")
        params["champion_id"] = champion_id

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
        f"SELECT * FROM matches WHERE {where} "
        f"ORDER BY game_start DESC LIMIT %(limit)s"
    )

    rows = ch.query(sql, params)

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
        data.append(
            schemas.MatchParticipant(
                match_id=row.get("match_id", ""),
                platform_id=row.get("platform_id", ""),
                queue_id=row.get("queue_id", 0),
                game_version=row.get("game_version", ""),
                game_duration=row.get("game_duration", 0),
                game_start=row.get("game_start", ""),
                puuid=row.get("puuid", ""),
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
            ).model_dump()
        )

    return paginated_response(
        data,
        cursor=next_cursor,
        has_more=has_more,
    )
