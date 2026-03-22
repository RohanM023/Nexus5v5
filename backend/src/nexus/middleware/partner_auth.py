"""Partner API key authentication middleware for widget endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.admin.partner_keys import validate_api_key
from nexus.shared.database import get_db_session
from nexus.shared.redis import rate_limit_check

logger = logging.getLogger(__name__)


async def verify_partner_key(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Verify the X-Nexus-Api-Key header for widget endpoints."""
    api_key = request.headers.get("X-Nexus-Api-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-Nexus-Api-Key header")

    partner = await validate_api_key(db, api_key)
    if partner is None:
        raise HTTPException(status_code=403, detail="Invalid or revoked API key")

    # Check allowed origins
    origin = request.headers.get("Origin", "")
    allowed = partner.get("allowed_origins", [])
    if allowed and origin and origin not in allowed:
        raise HTTPException(status_code=403, detail="Origin not allowed for this API key")

    # Enforce per-partner rate limit (sliding window via Redis)
    rate_limit = partner.get("rate_limit_per_minute", 60)
    key_id = partner["id"]
    allowed_request = await rate_limit_check(
        f"ratelimit:partner:{key_id}:minute",
        max_requests=rate_limit,
        window_seconds=60,
    )
    if not allowed_request:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded ({rate_limit} requests/minute)",
        )

    return partner
