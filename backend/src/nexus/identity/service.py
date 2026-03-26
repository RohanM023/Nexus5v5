"""Business logic for identity: register, login, link account, verify, profile."""

from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from nexus.config import get_settings
from nexus.identity.models import IdentityLink, RefreshToken, RiotAccount, User
from nexus.identity.riot_client import (
    generate_verification_token,
    resolve_puuid,
    verify_summoner_icon,
)
from nexus.middleware.auth import create_access_token, create_refresh_token, decode_token
from nexus.shared.exceptions import AuthError, ConflictError, NotFoundError, ValidationError

logger = logging.getLogger(__name__)

MAX_LINKED_ACCOUNTS = 5

_BCRYPT_WORK_FACTOR = 12


def _hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=_BCRYPT_WORK_FACTOR)).decode("ascii")


def _verify_password(plain: str, hashed: str) -> bool:
    pw = plain.encode("utf-8")[:72]
    return bcrypt.checkpw(pw, hashed.encode("ascii"))


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    display_name: str,
) -> tuple[User, str, str]:
    """Register a new user. Returns (user, access_token, refresh_token)."""
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("An account with this email already exists")

    user = User(
        email=email,
        password_hash=_hash_password(password),
        display_name=display_name,
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    settings = get_settings()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(rt)

    return user, access_token, refresh_token


async def login_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> tuple[User, str, str]:
    """Authenticate a user. Returns (user, access_token, refresh_token)."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        raise AuthError("Invalid email or password")

    if not _verify_password(password, user.password_hash):
        raise AuthError("Invalid email or password")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    settings = get_settings()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(rt)

    return user, access_token, refresh_token


async def refresh_access_token(
    db: AsyncSession,
    refresh_token: str,
) -> str:
    """Validate refresh token and issue a new access token."""
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise AuthError("Invalid token type")

    token_hash = _hash_token(refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = result.scalar_one_or_none()

    if rt is None:
        raise AuthError("Invalid refresh token")

    if rt.expires_at < datetime.now(UTC):
        await db.delete(rt)
        raise AuthError("Refresh token has expired")

    return create_access_token(rt.user_id)


async def logout_user(db: AsyncSession, refresh_token: str) -> None:
    """Invalidate a refresh token."""
    token_hash = _hash_token(refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = result.scalar_one_or_none()
    if rt is not None:
        await db.delete(rt)


async def link_riot_account(
    db: AsyncSession,
    user_id: UUID,
    game_name: str,
    tag_line: str,
    region: str,
) -> RiotAccount:
    """Link a Riot account to a user by resolving the PUUID from Riot API."""
    # Check max accounts limit
    result = await db.execute(select(RiotAccount).where(RiotAccount.user_id == user_id))
    existing_accounts = result.scalars().all()
    if len(existing_accounts) >= MAX_LINKED_ACCOUNTS:
        raise ValidationError(f"Maximum of {MAX_LINKED_ACCOUNTS} linked accounts allowed")

    # Resolve PUUID via Riot API
    account_data = await resolve_puuid(game_name, tag_line, region)
    puuid = account_data["puuid"]

    # Check if PUUID is already linked to another user
    result = await db.execute(select(RiotAccount).where(RiotAccount.puuid == puuid))
    existing = result.scalar_one_or_none()
    if existing is not None:
        if existing.user_id == user_id:
            raise ConflictError("This Riot account is already linked to your profile")
        raise ConflictError("This Riot account is already linked to another user")

    is_primary = len(existing_accounts) == 0

    riot_account = RiotAccount(
        user_id=user_id,
        puuid=puuid,
        game_name=game_name,
        tag_line=tag_line,
        region=region,
        is_primary=is_primary,
    )
    db.add(riot_account)
    await db.flush()

    # Create identity link record
    verification_token = generate_verification_token()
    link = IdentityLink(
        user_id=user_id,
        account_id=riot_account.id,
        verification_status="pending",
        verification_method="icon",
        verification_token=str(verification_token),
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )
    db.add(link)

    return riot_account


async def verify_riot_account(
    db: AsyncSession,
    user_id: UUID,
    account_id: UUID,
) -> IdentityLink:
    """Verify a Riot account by checking the summoner icon."""
    result = await db.execute(
        select(RiotAccount).where(
            RiotAccount.id == account_id,
            RiotAccount.user_id == user_id,
        )
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise NotFoundError("Riot account not found")

    if account.verified:
        raise ValidationError("Account is already verified")

    # Get the pending identity link
    result = await db.execute(
        select(IdentityLink).where(
            IdentityLink.account_id == account_id,
            IdentityLink.verification_status == "pending",
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise NotFoundError("No pending verification found for this account")

    if link.expires_at and link.expires_at < datetime.now(UTC):
        link.verification_status = "expired"
        raise ValidationError("Verification window has expired. Please start a new verification.")

    # Check icon via Riot API
    icon_id = int(link.verification_token) if link.verification_token else 0
    is_verified = await verify_summoner_icon(account.puuid, icon_id, account.region)

    if is_verified:
        link.verification_status = "verified"
        link.verified_at = datetime.now(UTC)
        account.verified = True
        account.verified_at = datetime.now(UTC)
    else:
        link.verification_status = "failed"

    return link


async def unlink_riot_account(
    db: AsyncSession,
    user_id: UUID,
    account_id: UUID,
) -> None:
    """Unlink a Riot account from a user."""
    result = await db.execute(
        select(RiotAccount).where(
            RiotAccount.id == account_id,
            RiotAccount.user_id == user_id,
        )
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise NotFoundError("Riot account not found")

    # Cannot unlink the only verified account
    result = await db.execute(
        select(RiotAccount).where(
            RiotAccount.user_id == user_id,
            RiotAccount.verified.is_(True),
        )
    )
    verified_accounts = result.scalars().all()
    if len(verified_accounts) <= 1 and account.verified:
        raise ValidationError("Cannot unlink your only verified account")

    await db.delete(account)


async def get_master_profile(db: AsyncSession, user_id: UUID) -> tuple[User, list[RiotAccount]]:
    """Get a user's master profile with all linked accounts."""
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.riot_accounts))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User not found")

    return user, list(user.riot_accounts)


async def get_public_profile(db: AsyncSession, user_id: UUID) -> tuple[User, list[RiotAccount]]:
    """Get a public profile view (no email, only verified accounts)."""
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.riot_accounts))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User not found")

    verified_accounts = [a for a in user.riot_accounts if a.verified]
    return user, verified_accounts
