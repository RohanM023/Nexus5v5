"""FastAPI router for identity and auth endpoints."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.identity import schemas, service
from nexus.middleware.auth import get_current_user
from nexus.shared.database import get_db_session

auth_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
identity_router = APIRouter(prefix="/api/v1/identity", tags=["identity"])


# --- Auth Endpoints ---


@auth_router.post("/register", response_model=schemas.TokenResponse, status_code=201)
async def register(
    body: schemas.RegisterRequest,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    user, access_token, refresh_token = await service.register_user(
        db, body.email, body.password, body.display_name
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@auth_router.post("/login", response_model=schemas.TokenResponse)
async def login(
    body: schemas.LoginRequest,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    user, access_token, refresh_token = await service.login_user(db, body.email, body.password)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@auth_router.post("/refresh", response_model=schemas.AccessTokenResponse)
async def refresh_token(
    body: schemas.RefreshRequest,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    access_token = await service.refresh_access_token(db, body.refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.post("/logout", status_code=204)
async def logout(
    body: schemas.RefreshRequest,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    await service.logout_user(db, body.refresh_token)


# --- Identity Endpoints ---


@identity_router.get("/me", response_model=schemas.MasterProfileResponse)
async def get_me(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    user, accounts = await service.get_master_profile(db, current_user["user_id"])
    return {
        "user": user,
        "accounts": accounts,
        "total_accounts": len(accounts),
    }


@identity_router.post("/link", response_model=schemas.RiotAccountResponse, status_code=201)
async def link_account(
    body: schemas.LinkAccountRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> Any:
    return await service.link_riot_account(
        db,
        current_user["user_id"],
        body.game_name,
        body.tag_line,
        body.region,
    )


@identity_router.delete("/link/{account_id}", status_code=204)
async def unlink_account(
    account_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    await service.unlink_riot_account(db, current_user["user_id"], account_id)


@identity_router.post("/verify/{account_id}", response_model=schemas.VerifyAccountResponse)
async def verify_account(
    account_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    link = await service.verify_riot_account(db, current_user["user_id"], account_id)
    message = (
        "Account verified successfully!"
        if link.verification_status == "verified"
        else "Verification failed. Please ensure the correct icon is set."
    )
    return {
        "account_id": account_id,
        "verification_status": link.verification_status,
        "verification_method": link.verification_method,
        "message": message,
    }


@identity_router.get("/profile/{user_id}", response_model=schemas.PublicProfileResponse)
async def get_public_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    user, accounts = await service.get_public_profile(db, user_id)
    return {
        "id": user.id,
        "display_name": user.display_name,
        "accounts": accounts,
    }
