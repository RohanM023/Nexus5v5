"""ETL pipeline: fetch matches from Riot Match-v5, transform, load into ClickHouse."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from nexus.match.models import CLICKHOUSE_COLUMNS, MatchRow
from nexus.shared import clickhouse as ch
from nexus.shared.redis import cache_get, cache_set
from nexus.shared.riot_api import get_riot_client

logger = logging.getLogger(__name__)

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


def _get_existing_match_ids(puuid: str, match_ids: list[str]) -> set[str]:
    """Check which match IDs already exist in ClickHouse for this PUUID."""
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
    rows = ch.query(sql, params)
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

    return MatchRow(
        match_id=metadata.get("matchId", ""),
        platform_id=(
            metadata.get("matchId", "").split("_")[0] if "_" in metadata.get("matchId", "") else ""
        ),
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
        cs=participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0),
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

    gold_diffs: list[int] = []
    for frame in frames:
        pf = frame.get("participantFrames", {}).get(str(pid), {})
        total_gold = pf.get("totalGold", 0)
        # Gold diff vs lane opponent: simplified as total gold for now
        gold_diffs.append(total_gold)

    return json.dumps(gold_diffs)


async def ingest_matches(
    puuid: str,
    region: str = "na1",
    queue_ids: list[int] | None = None,
    count: int = 20,
) -> dict[str, int]:
    """Fetch, transform, and load match history for a PUUID.

    Returns dict with matches_fetched and matches_inserted counts.
    """
    if queue_ids is None:
        queue_ids = [420, 700]

    client = get_riot_client()
    all_match_ids: list[str] = []

    for queue_id in queue_ids:
        ids = await client.get_match_ids(puuid, region, queue=queue_id, count=count)
        all_match_ids.extend(ids)

    # Deduplicate
    all_match_ids = list(dict.fromkeys(all_match_ids))

    if not all_match_ids:
        return {"matches_fetched": 0, "matches_inserted": 0}

    # Filter out already-ingested matches
    existing = _get_existing_match_ids(puuid, all_match_ids)
    new_match_ids = [mid for mid in all_match_ids if mid not in existing]

    if not new_match_ids:
        return {"matches_fetched": len(all_match_ids), "matches_inserted": 0}

    rows_to_insert: list[list] = []
    fetched = 0

    for match_id in new_match_ids:
        match_data = await client.get_match(match_id, region)
        if match_data is None:
            continue

        fetched += 1
        timeline_data = await client.get_match_timeline(match_id, region)

        for participant in match_data.get("info", {}).get("participants", []):
            row = _extract_participant(match_data, participant)

            if timeline_data:
                row.gold_diff_timeline = _extract_gold_diff_timeline(
                    timeline_data, participant.get("puuid", "")
                )

            rows_to_insert.append(row.to_row())

        # Batch insert
        if len(rows_to_insert) >= BATCH_SIZE:
            ch.insert_rows("matches", rows_to_insert, CLICKHOUSE_COLUMNS)
            rows_to_insert = []

    # Insert remaining rows
    if rows_to_insert:
        ch.insert_rows("matches", rows_to_insert, CLICKHOUSE_COLUMNS)

    # Update watermark to newest match
    if new_match_ids:
        await set_watermark(puuid, new_match_ids[0])

    inserted = fetched  # each fetched match is inserted
    logger.info(
        "Ingestion complete for %s: fetched=%d, inserted=%d",
        puuid,
        len(all_match_ids),
        inserted,
    )

    return {"matches_fetched": len(all_match_ids), "matches_inserted": inserted}
