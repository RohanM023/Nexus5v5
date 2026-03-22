"""arq job functions for match ingestion."""

from __future__ import annotations

import logging
from typing import Any

from arq.jobs import Job

from nexus.match.ingestion import ingest_matches

logger = logging.getLogger(__name__)


async def run_ingest_matches(
    ctx: dict[str, Any],
    puuid: str,
    region: str = "na1",
    queue_ids: list[int] | None = None,
    count: int = 20,
    fetch_timelines: bool = False,
) -> dict[str, int]:
    """arq job: fetch, transform, and load match history for a PUUID."""
    logger.info("Starting ingestion job for puuid=%s region=%s", puuid, region)
    try:
        result = await ingest_matches(
            puuid=puuid,
            region=region,
            queue_ids=queue_ids,
            count=count,
            fetch_timelines=fetch_timelines,
        )
        logger.info(
            "Ingestion job completed for puuid=%s: fetched=%d inserted=%d",
            puuid,
            result["matches_fetched"],
            result["matches_inserted"],
        )
        return result
    except Exception:
        logger.exception("Ingestion job failed for puuid=%s", puuid)
        raise


async def enqueue_ingestion(
    redis_pool: Any,
    puuid: str,
    region: str = "na1",
    queue_ids: list[int] | None = None,
    count: int = 20,
    fetch_timelines: bool = False,
) -> Job:
    """Enqueue a match ingestion job and return the arq Job handle."""
    from arq.connections import ArqRedis

    pool: ArqRedis = redis_pool
    job = await pool.enqueue_job(
        "run_ingest_matches",
        puuid,
        region,
        queue_ids,
        count,
        fetch_timelines,
    )
    if job is None:
        raise RuntimeError(f"Failed to enqueue ingestion job for {puuid}")
    return job
