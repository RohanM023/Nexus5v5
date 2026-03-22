"""FastAPI application factory for Nexus-5v5."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from nexus.config import get_settings
from nexus.shared.exceptions import NexusError


def _configure_logging() -> None:
    settings = get_settings()
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
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle for database, Redis, ClickHouse, and arq."""
    from nexus.dependencies import close_arq_pool, get_arq_pool
    from nexus.shared.clickhouse import close_client, get_clickhouse_client
    from nexus.shared.database import dispose_engine, get_engine
    from nexus.shared.redis import close_redis, get_redis
    from nexus.shared.riot_api import close_riot_client

    logger = structlog.get_logger(__name__)

    # Startup
    logger.info("Starting Nexus-5v5 application")
    get_engine()
    await get_redis()
    get_clickhouse_client()
    await get_arq_pool()
    logger.info("All connections initialised")

    yield

    # Shutdown
    logger.info("Shutting down Nexus-5v5 application")
    await close_arq_pool()
    await close_riot_client()
    await close_redis()
    close_client()
    await dispose_engine()
    logger.info("All connections closed")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    _configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
    )

    # --- Middleware ---
    from nexus.middleware.cors import add_cors_middleware
    from nexus.middleware.rate_limit import RateLimitMiddleware
    from nexus.middleware.security_headers import SecurityHeadersMiddleware

    add_cors_middleware(app)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    # --- Exception handlers ---
    @app.exception_handler(NexusError)
    async def nexus_error_handler(request: Request, exc: NexusError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    # --- Routers ---
    from nexus.admin.router import router as admin_router
    from nexus.analytics.router import router as analytics_router
    from nexus.draft.router import router as draft_router
    from nexus.identity.router import auth_router, identity_router
    from nexus.match.router import router as match_router
    from nexus.summoner.router import router as summoner_router
    from nexus.widgets.router import router as widgets_router

    app.include_router(auth_router)
    app.include_router(identity_router)
    app.include_router(draft_router)
    app.include_router(match_router)
    app.include_router(analytics_router)
    app.include_router(admin_router)
    app.include_router(summoner_router)
    app.include_router(widgets_router)

    return app


app = create_app()
