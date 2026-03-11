"""Pydantic schemas for identity and auth requests/responses."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

# --- Auth ---


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105


# --- Riot Account ---


class LinkAccountRequest(BaseModel):
    game_name: str = Field(min_length=1, max_length=16)
    tag_line: str = Field(min_length=1, max_length=5)
    region: str = Field(default="na1", min_length=2, max_length=10)


class RiotAccountResponse(BaseModel):
    id: UUID
    puuid: str
    game_name: str
    tag_line: str
    region: str
    is_primary: bool
    verified: bool
    verified_at: datetime | None = None
    linked_at: datetime

    model_config = {"from_attributes": True}


class VerifyAccountResponse(BaseModel):
    account_id: UUID
    verification_status: str
    verification_method: str
    verification_token: str | None = None
    message: str


# --- User Profile ---


class UserResponse(BaseModel):
    id: UUID
    email: str | None = None
    display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MasterProfileResponse(BaseModel):
    user: UserResponse
    accounts: list[RiotAccountResponse]
    total_accounts: int


class PublicProfileResponse(BaseModel):
    id: UUID
    display_name: str
    accounts: list[RiotAccountResponse]
