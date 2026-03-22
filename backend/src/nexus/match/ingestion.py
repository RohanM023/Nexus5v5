"""ETL pipeline: fetch matches from Riot Match-v5, transform, load into ClickHouse."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime
from typing import Any

from prometheus_client import Counter, Gauge, Histogram

from nexus.match.models import CLICKHOUSE_COLUMNS, MatchRow
from nexus.match.schemas import BLOCKED_QUEUE_IDS
from nexus.shared import clickhouse as ch
from nexus.shared.redis import cache_get, cache_set
from nexus.shared.riot_api import get_riot_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prometheus metrics (E3-T09)
# ---------------------------------------------------------------------------
MATCHES_FETCHED = Counter(
    "matches_fetched_total",
    "Total match IDs fetched from Riot API",
    ["region"],
)
MATCHES_INSERTED = Counter(
    "matches_inserted_total",
    "Total matches successfully inserted into ClickHouse",
    ["region"],
)
INGESTION_ERRORS = Counter(
    "ingestion_errors_total",
    "Total errors during match ingestion",
    ["region", "stage"],
)
INGESTION_DURATION = Histogram(
    "ingestion_job_duration_seconds",
    "Duration of a single ingestion job in seconds",
    ["region"],
    buckets=(1, 5, 10, 30, 60, 120, 300, 600),
)
ACTIVE_INGESTION_JOBS = Gauge(
    "active_ingestion_jobs",
    "Number of ingestion jobs currently running",
)

WATERMARK_KEY_PREFIX = "ingestion:watermark"
BATCH_SIZE = 1000

# Role mapping from Riot API to our standard
ROLE_MAP: dict[str, str] = {
    "TOP": "TOP",
    "JUNGLE": "JUNGLE",
    "MIDDLE": "MID",
    "BOTTOM": "BOT",
    "UTILITY": "SUPPORT",
}


async def get_watermark(puuid: str) -> str | None:
    """Get the last ingested match ID for incremental ingestion."""
    return await cache_get(f"{WATERMARK_KEY_PREFIX}:{puuid}")


async def set_watermark(puuid: str, match_id: str) -> None:
    """Store the latest ingested match ID."""
    await cache_set(
        f"{WATERMARK_KEY_PREFIX}:{puuid}",
        match_id,
        ttl_seconds=86400 * 30,  # 30 days
    )


async def _get_existing_match_ids(puuid: str, match_ids: list[str]) -> set[str]:
    """Check which match IDs already exist in ClickHouse for this PUUID.

    Runs the synchronous ClickHouse query in an executor to avoid
    blocking the event loop.
    """
    if not match_ids:
        return set()

    params: dict[str, Any] = {"puuid": puuid}
    placeholders = []
    for i, mid in enumerate(match_ids):
        key = f"mid_{i}"
        placeholders.append(f"%({key})s")
        params[key] = mid

    in_clause = ", ".join(placeholders)
    sql = (  # noqa: S608
        f"SELECT DISTINCT match_id FROM matches "
        f"WHERE puuid = %(puuid)s AND match_id IN ({in_clause})"
    )

    loop = asyncio.get_running_loop()
    rows = await loop.run_in_executor(None, ch.query, sql, params)
    return {row["match_id"] for row in rows}


def _extract_participant(
    match_data: dict[str, Any],
    participant: dict[str, Any],
) -> MatchRow:
    """Transform a Riot match participant into a ClickHouse row."""
    info = match_data["info"]
    metadata = match_data["metadata"]

    team_id = participant.get("teamId", 100)
    winning_team = next(
        (t["teamId"] for t in info.get("teams", []) if t.get("win")),
        None,
    )

    role = ROLE_MAP.get(
        participant.get("teamPosition", ""),
        participant.get("teamPosition", "UNKNOWN"),
    )

    game_start_ms = info.get("gameStartTimestamp", 0)
    game_start = datetime.fromtimestamp(game_start_ms / 1000, tz=UTC)

    raw_match_id = metadata.get("matchId", "")

    return MatchRow(
        match_id=raw_match_id,
        platform_id=raw_match_id.split("_")[0] if "_" in raw_match_id else "",
        queue_id=info.get("queueId", 0),
        game_version=info.get("gameVersion", ""),
        game_duration=info.get("gameDuration", 0),
        game_start=game_start,
        puuid=participant.get("puuid", ""),
        champion_id=participant.get("championId", 0),
        champion_name=participant.get("championName", ""),
        team_id=team_id,
        role=role,
        win=1 if team_id == winning_team else 0,
        kills=participant.get("kills", 0),
        deaths=participant.get("deaths", 0),
        assists=participant.get("assists", 0),
        cs=(participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0)),
        gold_earned=participant.get("goldEarned", 0),
        damage_dealt=participant.get("totalDamageDealtToChampions", 0),
        damage_taken=participant.get("totalDamageTaken", 0),
        vision_score=participant.get("visionScore", 0),
    )


def _extract_gold_diff_timeline(
    timeline_data: dict[str, Any],
    puuid: str,
) -> str:
    """Extract per-minute gold diff from timeline data for a participant."""
    if not timeline_data:
        return "[]"

    frames = timeline_data.get("info", {}).get("frames", [])
    participants = timeline_data.get("info", {}).get("participants", [])

    # Find participant ID for this PUUID
    pid = None
    for p in participants:
        if p.get("puuid") == puuid:
            pid = p.get("participantId")
            break

    if pid is None:
        return "[]"

    # Determine the lane opponent's participant ID (opposite team, same position)
    # For simplicity, compute gold diff as total gold for now (opponent
    # matching requires additional position heuristics).
    gold_diffs: list[int] = []
    for frame in frames:
        pf = frame.get("participantFrames", {}).get(str(pid), {})
        total_gold = pf.get("totalGold", 0)
        gold_diffs.append(total_gold)

    return json.dumps(gold_diffs)


async def _insert_rows_async(
    table: str,
    data: list[list[Any]],
    column_names: list[str],
) -> None:
    """Run the synchronous ClickHouse insert in an executor."""
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, ch.insert_rows, table, data, column_names)


async def ingest_matches(
    puuid: str,
    region: str = "na1",
    queue_ids: list[int] | None = None,
    count: int = 20,
    *,
    fetch_timelines: bool = False,
) -> dict[str, int]:
    """Fetch, transform, and load match history for a PUUID.

    Supports incremental ingestion via Redis watermarks and ClickHouse
    deduplication.  Returns dict with matches_fetched and matches_inserted
    counts.

    Set ``fetch_timelines=True`` to also pull per-minute gold-diff data
    (doubles the number of Riot API calls).
    """
    if queue_ids is None:
        queue_ids = [420, 700]

    ACTIVE_INGESTION_JOBS.inc()
    timer = INGESTION_DURATION.labels(region=region).time()
    timer.__enter__()

    try:
        return await _do_ingest(puuid, region, queue_ids, count, fetch_timelines=fetch_timelines)
    except Exception:
        INGESTION_ERRORS.labels(region=region, stage="job").inc()
        raise
    finally:
        timer.__exit__(None, None, None)
        ACTIVE_INGESTION_JOBS.dec()


async def _do_ingest(
    puuid: str,
    region: str,
    queue_ids: list[int],
    count: int,
    *,
    fetch_timelines: bool = False,
) -> dict[str, int]:
    """Inner ingestion logic, separated for clean metrics wrapping."""
    client = get_riot_client()
    all_match_ids: list[str] = []

    # Defence-in-depth: filter out Riot-TOS-blocked queue IDs
    queue_ids = [q for q in queue_ids if q not in BLOCKED_QUEUE_IDS]

    # Read watermark for incremental fetch
    watermark = await get_watermark(puuid)

    for queue_id in queue_ids:
        try:
            ids = await client.get_match_ids(puuid, region, queue=queue_id, count=count)
        except Exception:
            INGESTION_ERRORS.labels(region=region, stage="fetch_ids").inc()
            raise
        if watermark and watermark in ids:
            # Only take matches newer than the watermark
            watermark_idx = ids.index(watermark)
            ids = ids[:watermark_idx]
        all_match_ids.extend(ids)

    # Deduplicate preserving order (newest first from Riot API)
    all_match_ids = list(dict.fromkeys(all_match_ids))
    MATCHES_FETCHED.labels(region=region).inc(len(all_match_ids))

    if not all_match_ids:
        return {"matches_fetched": 0, "matches_inserted": 0}

    # Double-check against ClickHouse for matches that slipped past watermark
    existing = await _get_existing_match_ids(puuid, all_match_ids)
    new_match_ids = [mid for mid in all_match_ids if mid not in existing]

    if not new_match_ids:
        return {"matches_fetched": len(all_match_ids), "matches_inserted": 0}

    rows_to_insert: list[list[Any]] = []
    matches_inserted = 0

    for match_id in new_match_ids:
        try:
            match_data = await client.get_match(match_id, region)
        except Exception:
            INGESTION_ERRORS.labels(region=region, stage="fetch_match").inc()
            raise
        if match_data is None:
            continue

        timeline_data = None
        if fetch_timelines:
            try:
                timeline_data = await client.get_match_timeline(match_id, region)
            except Exception:
                INGESTION_ERRORS.labels(region=region, stage="fetch_timeline").inc()
                raise

        for participant in match_data.get("info", {}).get("participants", []):
            row = _extract_participant(match_data, participant)

            if timeline_data:
                row.gold_diff_timeline = _extract_gold_diff_timeline(
                    timeline_data, participant.get("puuid", "")
                )

            rows_to_insert.append(row.to_row())

        matches_inserted += 1

        # Batch insert when we hit the threshold
        if len(rows_to_insert) >= BATCH_SIZE:
            try:
                await _insert_rows_async("matches", rows_to_insert, CLICKHOUSE_COLUMNS)
            except Exception:
                INGESTION_ERRORS.labels(region=region, stage="insert").inc()
                raise
            rows_to_insert = []

    # Insert remaining rows
    if rows_to_insert:
        try:
            await _insert_rows_async("matches", rows_to_insert, CLICKHOUSE_COLUMNS)
        except Exception:
            INGESTION_ERRORS.labels(region=region, stage="insert").inc()
            raise

    MATCHES_INSERTED.labels(region=region).inc(matches_inserted)

    # Update watermark to newest match (first in the list from Riot API)
    if new_match_ids:
        await set_watermark(puuid, new_match_ids[0])

    logger.info(
        "Ingestion complete for %s: fetched=%d, inserted=%d",
        puuid,
        len(all_match_ids),
        matches_inserted,
    )

    return {
        "matches_fetched": len(all_match_ids),
        "matches_inserted": matches_inserted,
    }
