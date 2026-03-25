"""JWT RS256 verification middleware and dependencies."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from nexus.config import Settings, get_settings
from nexus.shared.exceptions import AuthError

logger = logging.getLogger(__name__)

_security = HTTPBearer(auto_error=False)

_public_key_cache: str | None = None
_private_key_cache: str | None = None


def _load_key(path: str) -> str | None:
    p = Path(path)
    if p.exists():
        return p.read_text().strip()
    return None


def _get_public_key(settings: Settings) -> str:
    global _public_key_cache
    if _public_key_cache is None:
        key = _load_key(settings.jwt_public_key_path)
        _public_key_cache = key or settings.jwt_secret_key
    return _public_key_cache


def _get_private_key(settings: Settings) -> str:
    global _private_key_cache
    if _private_key_cache is None:
        key = _load_key(settings.jwt_private_key_path)
        _private_key_cache = key or settings.jwt_secret_key
    return _private_key_cache


def _get_algorithm(settings: Settings) -> str:
    key = _load_key(settings.jwt_private_key_path)
    if key and key.startswith("-----BEGIN"):
        return "RS256"
    if settings.environment == "production":
        raise RuntimeError("RS256 keys missing in production — JWT security compromised")
    return "HS256"


def create_access_token(
    user_id: UUID,
    *,
    settings: Settings | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    if settings is None:
        settings = get_settings()

    algorithm = _get_algorithm(settings)
    private_key = _get_private_key(settings)

    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now.timestamp() + settings.jwt_access_token_expire_minutes * 60,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, private_key, algorithm=algorithm)


def create_refresh_token(
    user_id: UUID,
    *,
    settings: Settings | None = None,
) -> str:
    if settings is None:
        settings = get_settings()

    algorithm = _get_algorithm(settings)
    private_key = _get_private_key(settings)

    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now.timestamp() + settings.jwt_refresh_token_expire_days * 86400,
        "type": "refresh",
    }
    return jwt.encode(payload, private_key, algorithm=algorithm)


def decode_token(token: str, *, settings: Settings | None = None) -> dict[str, Any]:
    if settings is None:
        settings = get_settings()

    algorithm = _get_algorithm(settings)
    public_key = _get_public_key(settings)

    try:
        payload = jwt.decode(token, public_key, algorithms=[algorithm])
    except JWTError as exc:
        raise AuthError("Invalid or expired token") from exc

    return payload


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """FastAPI dependency that extracts and validates the JWT from the Authorization header."""
    if credentials is None:
        raise AuthError("Missing authentication credentials")

    payload = decode_token(credentials.credentials, settings=settings)

    if payload.get("type") != "access":
        raise AuthError("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("Invalid token payload")

    request.state.user_id = user_id
    return {"user_id": UUID(user_id), "token_payload": payload}


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any] | None:
    """Optional auth: returns None if no token is provided."""
    if credentials is None:
        return None

    try:
        payload = decode_token(credentials.credentials, settings=settings)
        user_id = payload.get("sub")
        if user_id:
            return {"user_id": UUID(user_id), "token_payload": payload}
    except AuthError:
        pass

    return None
