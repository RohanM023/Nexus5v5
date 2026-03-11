"""Redis-backed rate limiting middleware."""

from __future__ import annotations

import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from nexus.config import get_settings
from nexus.shared.redis import rate_limit_check

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limits auth endpoints by client IP."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not request.url.path.startswith("/api/v1/auth/"):
            return await call_next(request)

        settings = get_settings()
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:auth:{client_ip}:{request.url.path}"

        allowed = await rate_limit_check(
            key,
            max_requests=settings.auth_rate_limit_per_minute,
            window_seconds=60,
        )

        if not allowed:
            logger.warning("Rate limit exceeded for %s on %s", client_ip, request.url.path)
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_ERROR",
                        "message": "Too many requests. Please try again later.",
                        "details": [],
                    }
                },
            )

        return await call_next(request)
