"""Backfill match history for all linked Riot accounts.

Iterates through all verified riot_accounts in PostgreSQL, triggers match
ingestion for each PUUID, and writes results to ClickHouse. Useful for
initial data seeding or catching up after downtime.

Usage:
    python scripts/backfill_matches.py
    python scripts/backfill_matches.py --limit 50 --queue 420
    python scripts/backfill_matches.py --puuid <specific-puuid>

Environment variables (or .env):
    POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    CLICKHOUSE_HOST, CLICKHOUSE_PORT, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_DB
    REDIS_HOST, REDIS_PORT
    RIOT_API_KEY
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

import httpx
import structlog

log = structlog.get_logger()

# Riot API endpoints
MATCH_LIST_URL = "https://{routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
MATCH_DETAIL_URL = "https://{routing}.api.riotgames.com/lol/match/v5/matches/{match_id}"

REGION_TO_ROUTING = {
    "na1": "americas",
    "br1": "americas",
    "la1": "americas",
    "la2": "americas",
    "euw1": "europe",
    "eun1": "europe",
    "tr1": "europe",
    "ru": "europe",
    "kr": "asia",
    "jp1": "asia",
    "oc1": "sea",
    "ph2": "sea",
    "sg2": "sea",
    "th2": "sea",
    "tw2": "sea",
    "vn2": "sea",
}


async def get_puuids_from_db(limit: int | None = None) -> list[dict[str, str]]:
    """Fetch all verified riot_accounts from PostgreSQL."""
    try:
        import asyncpg
    except ImportError:
        log.error("asyncpg not installed. Run: uv pip install asyncpg")
        sys.exit(1)

    host = os.getenv("POSTGRES_HOST", "localhost")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    user = os.getenv("POSTGRES_USER", "nexus")
    password = os.getenv("POSTGRES_PASSWORD", "nexus")
    db = os.getenv("POSTGRES_DB", "nexus")

    conn = await asyncpg.connect(host=host, port=port, user=user, password=password, database=db)
    try:
        query = """
            SELECT puuid, region, game_name, tag_line
            FROM riot_accounts
            WHERE verified = true
            ORDER BY linked_at ASC
        """
        if limit:
            query += f" LIMIT {limit}"
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]
    finally:
        await conn.close()


async def fetch_match_ids(
    client: httpx.AsyncClient,
    puuid: str,
    routing: str,
    api_key: str,
    queue: int | None = None,
    count: int = 100,
) -> list[str]:
    """Fetch match IDs for a PUUID from Riot API."""
    params: dict[str, str | int] = {"start": 0, "count": count}
    if queue is not None:
        params["queue"] = queue

    url = MATCH_LIST_URL.format(routing=routing, puuid=puuid)
    resp = await client.get(url, params=params, headers={"X-Riot-Token": api_key})

    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "5"))
        log.warning("Rate limited, waiting", retry_after=retry_after, puuid=puuid[:8])
        await asyncio.sleep(retry_after)
        return await fetch_match_ids(client, puuid, routing, api_key, queue, count)

    resp.raise_for_status()
    return resp.json()


async def fetch_match_detail(
    client: httpx.AsyncClient,
    match_id: str,
    routing: str,
    api_key: str,
) -> dict:
    """Fetch full match detail from Riot API."""
    url = MATCH_DETAIL_URL.format(routing=routing, match_id=match_id)
    resp = await client.get(url, headers={"X-Riot-Token": api_key})

    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "5"))
        log.warning("Rate limited, waiting", retry_after=retry_after, match_id=match_id)
        await asyncio.sleep(retry_after)
        return await fetch_match_detail(client, match_id, routing, api_key)

    resp.raise_for_status()
    return resp.json()


def transform_match(match_data: dict) -> list[list]:
    """Transform a Riot match response into ClickHouse-ready rows."""
    info = match_data.get("info", {})
    metadata = match_data.get("metadata", {})

    match_id = metadata.get("matchId", "")
    platform_id = info.get("platformId", "")
    queue_id = info.get("queueId", 0)
    game_version = info.get("gameVersion", "")
    game_duration = info.get("gameDuration", 0)
    game_start_ts = info.get("gameStartTimestamp", 0)

    from datetime import datetime, timezone

    game_start = datetime.fromtimestamp(game_start_ts / 1000, tz=timezone.utc) if game_start_ts else None

    rows = []
    for p in info.get("participants", []):
        rows.append([
            match_id,
            platform_id,
            queue_id,
            game_version,
            game_duration,
            game_start,
            p.get("puuid", ""),
            p.get("championId", 0),
            p.get("championName", ""),
            p.get("teamId", 0),
            p.get("teamPosition", ""),
            1 if p.get("win") else 0,
            p.get("kills", 0),
            p.get("deaths", 0),
            p.get("assists", 0),
            p.get("totalMinionsKilled", 0) + p.get("neutralMinionsKilled", 0),
            p.get("goldEarned", 0),
            p.get("totalDamageDealtToChampions", 0),
            p.get("totalDamageTaken", 0),
            p.get("visionScore", 0),
            "[]",  # gold_diff_timeline (populated separately from timeline endpoint)
        ])

    return rows


async def insert_to_clickhouse(rows: list[list]) -> None:
    """Insert match rows into ClickHouse."""
    import clickhouse_connect

    client = clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
        username=os.getenv("CLICKHOUSE_USER", "default"),
        password=os.getenv("CLICKHOUSE_PASSWORD", ""),
        database=os.getenv("CLICKHOUSE_DB", "nexus"),
    )

    columns = [
        "match_id", "platform_id", "queue_id", "game_version", "game_duration",
        "game_start", "puuid", "champion_id", "champion_name", "team_id", "role",
        "win", "kills", "deaths", "assists", "cs", "gold_earned", "damage_dealt",
        "damage_taken", "vision_score", "gold_diff_timeline",
    ]

    try:
        client.insert("matches", rows, column_names=columns)
        log.info("Inserted rows into ClickHouse", count=len(rows))
    finally:
        client.close()


async def backfill_puuid(
    client: httpx.AsyncClient,
    puuid: str,
    routing: str,
    api_key: str,
    queue: int | None,
) -> int:
    """Backfill match history for a single PUUID. Returns number of matches ingested."""
    match_ids = await fetch_match_ids(client, puuid, routing, api_key, queue)
    if not match_ids:
        log.info("No matches found", puuid=puuid[:8])
        return 0

    log.info("Fetching match details", puuid=puuid[:8], matches=len(match_ids))

    all_rows: list[list] = []
    for i, mid in enumerate(match_ids):
        detail = await fetch_match_detail(client, mid, routing, api_key)
        rows = transform_match(detail)
        all_rows.extend(rows)

        # Rate limit: ~1 req/s to stay under 20/s limit
        if (i + 1) % 15 == 0:
            await asyncio.sleep(1.0)

    if all_rows:
        await insert_to_clickhouse(all_rows)

    return len(match_ids)


async def main() -> None:
    structlog.configure(
        processors=[structlog.dev.ConsoleRenderer()],
        wrapper_class=structlog.make_filtering_bound_logger(0),
    )

    parser = argparse.ArgumentParser(description="Backfill match history for linked Riot accounts.")
    parser.add_argument("--puuid", default=None, help="Backfill a specific PUUID only.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of accounts to process.")
    parser.add_argument("--queue", type=int, default=None, help="Filter by queue ID (420=Ranked, 700=Clash).")
    parser.add_argument("--count", type=int, default=100, help="Max matches per account. Default: 100.")
    args = parser.parse_args()

    api_key = os.getenv("RIOT_API_KEY", "")
    if not api_key:
        log.error("RIOT_API_KEY environment variable is required")
        sys.exit(1)

    if args.puuid:
        accounts = [{"puuid": args.puuid, "region": "na1", "game_name": "manual", "tag_line": "NA1"}]
    else:
        accounts = await get_puuids_from_db(args.limit)

    if not accounts:
        log.warning("No accounts found to backfill")
        return

    log.info("Starting backfill", accounts=len(accounts), queue=args.queue)
    total_matches = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for account in accounts:
            puuid = account["puuid"]
            region = account.get("region", "na1")
            routing = REGION_TO_ROUTING.get(region, "americas")

            log.info(
                "Processing account",
                game_name=account.get("game_name", "unknown"),
                region=region,
                puuid=puuid[:8],
            )

            try:
                count = await backfill_puuid(client, puuid, routing, api_key, args.queue)
                total_matches += count
            except httpx.HTTPStatusError as exc:
                log.error(
                    "API error, skipping account",
                    puuid=puuid[:8],
                    status=exc.response.status_code,
                )
            except Exception:
                log.exception("Unexpected error, skipping account", puuid=puuid[:8])

            # Small delay between accounts
            await asyncio.sleep(0.5)

    log.info("Backfill complete", total_accounts=len(accounts), total_matches=total_matches)


if __name__ == "__main__":
    asyncio.run(main())
