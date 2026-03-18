"""Pydantic schemas for admin endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class RiotQuotaResponse(BaseModel):
    per_second_limit: int
    per_2min_limit: int
    per_second_used_pct: float
    per_2min_used_pct: float
    auto_backoff_active: bool


class SynergyRebuildResponse(BaseModel):
    status: str
    message: str


class CreatePartnerKeyRequest(BaseModel):
    partner_name: str
    rate_limit_per_minute: int = 60
    allowed_origins: list[str] = Field(default_factory=list)


class PartnerKeyResponse(BaseModel):
    id: str
    partner_name: str
    api_key: str
    rate_limit_per_minute: int
    allowed_origins: list[str]
    created_at: str | None = None
