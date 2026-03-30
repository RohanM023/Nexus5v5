"""Rate-limited match crawler — discovers players via match graph and ingests history.

Runs as an arq cron job. Seeds from Challenger/GM ladders, walks the match graph
to discover new players, and ingests their match history using the existing ETL
pipeline. All operations respect Riot API rate limits and circuit-breaker guards.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from prometheus_client import Counter, Gauge

from nexus.match.ingestion import ingest_matches
from nexus.shared import clickhouse as ch
from nexus.shared.exceptions import RateLimitError, RiotAPIError
from nexus.shared.redis import get_redis
from nexus.shared.riot_api import get_riot_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis key constants
# ---------------------------------------------------------------------------
QUEUE_KEY = "crawler:queue:{region}"
SEEN_KEY = "crawler:seen:{region}"
KILL_SWITCH_KEY = "crawler:kill_switch"
CIRCUIT_BREAKER_KEY = "crawler:circuit_breaker"
STATS_KEY = "crawler:stats:{region}"

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------
CRAWLER_CYCLES = Counter(
    "crawler_cycles_total",
    "Total crawler cycles run",
    ["region", "status"],
)
CRAWLER_PLAYERS = Counter(
    "crawler_players_processed_total",
    "Players processed by crawler",
    ["region"],
)
CRAWLER_DISCOVERED = Counter(
    "crawler_players_discovered_total",
    "New players discovered",
    ["region"],
)
CRAWLER_CIRCUIT_BREAKS = Counter(
    "crawler_circuit_breaks_total",
    "Circuit breaker trips",
    ["region", "reason"],
)
CRAWLER_QUEUE_DEPTH = Gauge(
    "crawler_queue_depth",
    "Current crawler queue depth",
    ["region"],
)


# ---------------------------------------------------------------------------
# Guard helpers
# ---------------------------------------------------------------------------


async def is_kill_switch_active() -> bool:
    redis = await get_redis()
    return await redis.exists(KILL_SWITCH_KEY) > 0


async def is_circuit_breaker_active() -> bool:
    redis = await get_redis()
    return await redis.exists(CIRCUIT_BREAKER_KEY) > 0


async def trip_circuit_breaker(ttl: int, region: str, reason: str) -> None:
    redis = await get_redis()
    await redis.set(CIRCUIT_BREAKER_KEY, reason, ex=ttl)
    CRAWLER_CIRCUIT_BREAKS.labels(region=region, reason=reason).inc()
    logger.warning("Circuit breaker tripped: reason=%s ttl=%ds region=%s", reason, ttl, region)


async def _validate_api_key(region: str) -> bool:
    """Canary request to verify the API key is still valid."""
    client = get_riot_client()
    try:
        # Use challenger league endpoint — lightweight, no hardcoded PUUID
        await client.get_challenger_league(region=region)
        return True
    except RiotAPIError as exc:
        if exc.status_code in (400, 401, 403, 502):
            logger.critical(
                "API key invalid/expired — circuit breaker tripped (region=%s)", region
            )
            await trip_circuit_breaker(3600, region, "api_key_invalid")
            return False
        raise
    except RateLimitError:
        logger.warning("Rate limited during canary request, retrying once")
        await asyncio.sleep(2)
        try:
            await client.get_challenger_league(region=region)
            return True
        except (RateLimitError, RiotAPIError):
            await trip_circuit_breaker(600, region, "rate_limit_canary")
            return False


# ---------------------------------------------------------------------------
# Seed phase
# ---------------------------------------------------------------------------


async def seed_from_ladder(region: str) -> int:
    """Fetch Challenger + Grandmaster ladders and push unseen PUUIDs to queue."""
    client = get_riot_client()
    redis = await get_redis()
    queue_key = QUEUE_KEY.format(region=region)
    seen_key = SEEN_KEY.format(region=region)

    puuids: list[str] = []

    challenger = await client.get_challenger_league(region=region)
    if challenger and "entries" in challenger:
        puuids.extend(e["puuid"] for e in challenger["entries"] if e.get("puuid"))

    grandmaster = await client.get_grandmaster_league(region=region)
    if grandmaster and "entries" in grandmaster:
        puuids.extend(e["puuid"] for e in grandmaster["entries"] if e.get("puuid"))

    logger.info("Seed: fetched %d PUUIDs from ladder (region=%s)", len(puuids), region)

    new_count = 0
    for puuid in puuids:
        if await is_kill_switch_active():
            break
        already_seen = await redis.sismember(seen_key, puuid)
        if not already_seen:
            await redis.sadd(seen_key, puuid)
            await redis.lpush(queue_key, puuid)
            new_count += 1

    CRAWLER_QUEUE_DEPTH.labels(region=region).set(await redis.llen(queue_key))
    logger.info("Seed complete: %d new PUUIDs queued (region=%s)", new_count, region)
    return new_count


# ---------------------------------------------------------------------------
# Player discovery (graph walk)
# ---------------------------------------------------------------------------


async def _discover_players(puuid: str, region: str) -> list[str]:
    """Query ClickHouse for PUUIDs in the same matches as *puuid*."""
    sql = (
        "SELECT DISTINCT m2.puuid FROM matches AS m2 FINAL "
        "WHERE m2.match_id IN ("
        "  SELECT DISTINCT match_id FROM matches FINAL "
        "  WHERE puuid = %(puuid)s ORDER BY game_start DESC LIMIT 20"
        ") AND m2.puuid != %(puuid)s"
    )
    loop = asyncio.get_running_loop()
    try:
        rows = await loop.run_in_executor(None, ch.query, sql, {"puuid": puuid})
    except Exception:
        logger.warning("Discovery query failed for puuid=%s", puuid[:8])
        return []
    return [r["puuid"] for r in rows if r.get("puuid")]


async def _push_new_players(puuids: list[str], region: str) -> int:
    """Add unseen PUUIDs to the crawler queue. Returns count of new additions."""
    redis = await get_redis()
    queue_key = QUEUE_KEY.format(region=region)
    seen_key = SEEN_KEY.format(region=region)

    new_count = 0
    for puuid in puuids:
        if not await redis.sismember(seen_key, puuid):
            await redis.sadd(seen_key, puuid)
            await redis.lpush(queue_key, puuid)
            new_count += 1
    return new_count


# ---------------------------------------------------------------------------
# Main crawler cycle
# ---------------------------------------------------------------------------


async def run_crawler_cycle(
    region: str,
    max_players: int = 50,
    max_api_calls: int = 500,
    sleep_between: float = 0.5,
    match_count: int = 20,
) -> dict[str, Any]:
    """Execute one crawler cycle for *region*."""
    redis = await get_redis()
    queue_key = QUEUE_KEY.format(region=region)
    stats_key = STATS_KEY.format(region=region)
    start_time = time.monotonic()

    # --- Pre-flight checks ---
    if await is_kill_switch_active():
        logger.warning("Crawler kill switch active, aborting cycle (region=%s)", region)
        CRAWLER_CYCLES.labels(region=region, status="killed").inc()
        return {"status": "killed", "region": region}

    if await is_circuit_breaker_active():
        logger.warning("Circuit breaker active, skipping cycle (region=%s)", region)
        CRAWLER_CYCLES.labels(region=region, status="circuit_break").inc()
        return {"status": "circuit_break", "region": region}

    if not await _validate_api_key(region):
        CRAWLER_CYCLES.labels(region=region, status="api_key_invalid").inc()
        return {"status": "api_key_invalid", "region": region}

    # --- Seed if queue is empty ---
    queue_depth = await redis.llen(queue_key)
    if queue_depth == 0:
        logger.info("Queue empty, seeding from ladder (region=%s)", region)
        await seed_from_ladder(region)
        queue_depth = await redis.llen(queue_key)
        if queue_depth == 0:
            CRAWLER_CYCLES.labels(region=region, status="no_players").inc()
            return {"status": "no_players", "region": region}

    # --- Crawl phase ---
    players_processed = 0
    total_matches_inserted = 0
    total_discovered = 0
    consecutive_failures = 0

    for _ in range(max_players):
        # Guard checks between every player
        if await is_kill_switch_active():
            logger.warning("Kill switch activated mid-cycle (region=%s)", region)
            break
        if await is_circuit_breaker_active():
            logger.warning("Circuit breaker tripped mid-cycle (region=%s)", region)
            break

        puuid = await redis.rpop(queue_key)
        if puuid is None:
            break

        try:
            result = await ingest_matches(
                puuid=puuid,
                region=region,
                queue_ids=[420, 700],
                count=match_count,
            )
            matches_inserted = result.get("matches_inserted", 0)
            total_matches_inserted += matches_inserted
            players_processed += 1
            consecutive_failures = 0

            CRAWLER_PLAYERS.labels(region=region).inc()

            # Discover new players from ingested matches
            discovered = await _discover_players(puuid, region)
            new_count = await _push_new_players(discovered, region)
            total_discovered += new_count
            CRAWLER_DISCOVERED.labels(region=region).inc(new_count)

            # Update stats incrementally so admin panel shows real-time progress
            await redis.hincrby(stats_key, "players_processed", 1)
            await redis.hincrby(stats_key, "matches_inserted", matches_inserted)
            await redis.hset(stats_key, "last_run_at", str(int(time.time())))

            logger.info(
                "Crawled puuid=%s: inserted=%d discovered=%d (region=%s)",
                puuid[:8],
                matches_inserted,
                new_count,
                region,
            )

        except RateLimitError:
            logger.warning(
                "Rate limited during crawl, tripping circuit breaker (region=%s)", region
            )
            await trip_circuit_breaker(600, region, "rate_limit")
            break

        except RiotAPIError as exc:
            if exc.status_code in (401, 403, 502):
                logger.critical("API key error during crawl (region=%s)", region)
                await trip_circuit_breaker(3600, region, "api_key_invalid")
                break
            consecutive_failures += 1
            logger.warning(
                "API error for puuid=%s (attempt %d/3): %s",
                puuid[:8],
                consecutive_failures,
                exc.message,
            )
            if consecutive_failures >= 3:
                await trip_circuit_breaker(300, region, "consecutive_failures")
                break

        except Exception:
            consecutive_failures += 1
            logger.exception("Unexpected error crawling puuid=%s (region=%s)", puuid[:8], region)
            if consecutive_failures >= 3:
                await trip_circuit_breaker(300, region, "consecutive_failures")
                break

        await asyncio.sleep(sleep_between)

    # --- Update stats ---
    elapsed = round(time.monotonic() - start_time, 1)
    final_depth = await redis.llen(queue_key)
    CRAWLER_QUEUE_DEPTH.labels(region=region).set(final_depth)

    await redis.hincrby(stats_key, "cycles", 1)

    CRAWLER_CYCLES.labels(region=region, status="ok").inc()

    summary = {
        "status": "ok",
        "region": region,
        "players_processed": players_processed,
        "matches_inserted": total_matches_inserted,
        "players_discovered": total_discovered,
        "queue_depth": final_depth,
        "elapsed_seconds": elapsed,
    }
    logger.info("Crawler cycle complete: %s", summary)
    return summary
