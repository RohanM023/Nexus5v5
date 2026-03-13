"""arq worker configuration for background job processing."""

from __future__ import annotations

import logging
from typing import Any

import structlog
from arq import cron
from arq.connections import RedisSettings

from nexus.analytics.tasks import run_batch_analytics_refresh
from nexus.config import get_settings
from nexus.match.tasks import run_ingest_matches

logger = logging.getLogger(__name__)


async def startup(ctx: dict[str, Any]) -> None:
    """Initialise shared resources for the worker process."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    settings = get_settings()
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )
    logger.info("arq worker started")


async def shutdown(ctx: dict[str, Any]) -> None:
    """Cleanup resources on worker shutdown."""
    from nexus.shared.clickhouse import close_client
    from nexus.shared.redis import close_redis
    from nexus.shared.riot_api import close_riot_client

    await close_riot_client()
    await close_redis()
    close_client()
    logger.info("arq worker shut down")


def _get_redis_settings() -> RedisSettings:
    """Build arq RedisSettings from application config."""
    settings = get_settings()
    return RedisSettings(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password or None,
        database=settings.redis_db,
    )


class WorkerSettings:
    """arq WorkerSettings — this class is passed to ``arq worker``."""

    functions = [run_ingest_matches]
    cron_jobs = [
        cron(run_batch_analytics_refresh, hour=4, minute=0),
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _get_redis_settings()

    # Retry up to 3 times with exponential backoff
    max_tries = 4  # 1 initial + 3 retries
    retry_jobs = True

    # Job timeout: 5 minutes (some ingestion runs fetch many matches)
    job_timeout = 300

    # Maximum concurrent jobs per worker
    max_jobs = 10

    # Health check key in Redis
    health_check_key = "arq:worker:health"
    health_check_interval = 30
