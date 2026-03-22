"""Partner API key management."""

from __future__ import annotations

import hashlib
import json
import secrets
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def generate_api_key() -> str:
    """Generate a secure API key prefixed with 'nxs_'."""
    return f"nxs_{secrets.token_urlsafe(32)}"


def hash_api_key(key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


async def create_partner_key(
    db: AsyncSession,
    partner_name: str,
    rate_limit_per_minute: int = 60,
    allowed_origins: list[str] | None = None,
) -> dict[str, Any]:
    """Create a new partner API key. Returns the key (only shown once)."""
    raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)
    origins_json = json.dumps(allowed_origins or [])

    result = await db.execute(
        text(
            "INSERT INTO partner_api_keys "
            "(partner_name, api_key_hash, rate_limit_per_minute, allowed_origins) "
            "VALUES (:name, :hash, :rate_limit, :origins::jsonb) "
            "RETURNING id, created_at"
        ),
        {
            "name": partner_name,
            "hash": key_hash,
            "rate_limit": rate_limit_per_minute,
            "origins": origins_json,
        },
    )
    row = result.fetchone()
    await db.commit()
    return {
        "id": str(row[0]) if row else "",
        "partner_name": partner_name,
        "api_key": raw_key,
        "rate_limit_per_minute": rate_limit_per_minute,
        "allowed_origins": allowed_origins or [],
        "created_at": row[1].isoformat() if row and row[1] else None,
    }


async def list_partner_keys(db: AsyncSession) -> dict[str, Any]:
    """Return all partner keys with summary info (no raw key exposed)."""
    result = await db.execute(
        text(
            "SELECT id, partner_name, rate_limit_per_minute, "
            "usage_count, is_active, created_at "
            "FROM partner_api_keys ORDER BY created_at DESC"
        )
    )
    rows = result.fetchall()
    keys = [
        {
            "id": str(row[0]),
            "partner_name": row[1],
            "rate_limit_per_minute": row[2],
            "usage_count": row[3],
            "is_active": row[4],
            "created_at": row[5].isoformat() if row[5] else None,
        }
        for row in rows
    ]
    return {"keys": keys, "total": len(keys)}


async def revoke_partner_key(db: AsyncSession, key_id: str) -> bool:
    """Deactivate a partner API key."""
    result = await db.execute(
        text("UPDATE partner_api_keys SET is_active = false WHERE id = :id"),
        {"id": key_id},
    )
    await db.commit()
    return result.rowcount > 0


async def validate_api_key(db: AsyncSession, raw_key: str) -> dict[str, Any] | None:
    """Validate an API key and return partner info if valid."""
    key_hash = hash_api_key(raw_key)
    result = await db.execute(
        text(
            "SELECT id, partner_name, rate_limit_per_minute, allowed_origins, is_active "
            "FROM partner_api_keys WHERE api_key_hash = :hash"
        ),
        {"hash": key_hash},
    )
    row = result.fetchone()
    if not row or not row[4]:
        return None

    # Increment usage count
    await db.execute(
        text("UPDATE partner_api_keys SET usage_count = usage_count + 1 WHERE id = :id"),
        {"id": str(row[0])},
    )
    await db.commit()

    return {
        "id": str(row[0]),
        "partner_name": row[1],
        "rate_limit_per_minute": row[2],
        "allowed_origins": row[3],
    }
