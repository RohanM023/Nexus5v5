"""FastAPI router for match ingestion and match history."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query

from nexus.match import ingestion, schemas
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
) -> dict[str, Any]:
    """Trigger match history ingestion for a PUUID."""
    if body is None:
        body = schemas.IngestRequest()

    result = await ingestion.ingest_matches(
        puuid=puuid,
        queue_ids=body.queue_ids,
        count=body.count,
    )

    return {
        "puuid": puuid,
        "matches_fetched": result["matches_fetched"],
        "matches_inserted": result["matches_inserted"],
        "status": "completed",
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
    """Get paginated match history from ClickHouse."""
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
        f"SELECT * FROM matches WHERE {where} ORDER BY game_start DESC LIMIT %(limit)s"
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
            {
                "match_id": row.get("match_id", ""),
                "platform_id": row.get("platform_id", ""),
                "queue_id": row.get("queue_id", 0),
                "game_version": row.get("game_version", ""),
                "game_duration": row.get("game_duration", 0),
                "game_start": str(row.get("game_start", "")),
                "puuid": row.get("puuid", ""),
                "champion_id": row.get("champion_id", 0),
                "champion_name": row.get("champion_name", ""),
                "team_id": row.get("team_id", 0),
                "role": row.get("role", ""),
                "win": bool(row.get("win", 0)),
                "kills": row.get("kills", 0),
                "deaths": row.get("deaths", 0),
                "assists": row.get("assists", 0),
                "cs": row.get("cs", 0),
                "gold_earned": row.get("gold_earned", 0),
                "damage_dealt": row.get("damage_dealt", 0),
                "damage_taken": row.get("damage_taken", 0),
                "vision_score": row.get("vision_score", 0),
            }
        )

    return paginated_response(
        data,
        cursor=next_cursor,
        has_more=has_more,
    )
