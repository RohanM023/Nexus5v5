"""Pydantic schemas for community endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FindListingCreate(BaseModel):
    riot_id: str = Field(..., max_length=100)
    roles: list[str] = Field(..., min_length=1)
    rank: str | None = Field(None, max_length=50)
    champions: str | None = Field(None, max_length=300)
    discord: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=280)


class FindListingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    riot_id: str
    roles: list[str]
    rank: str | None
    champions: str | None
    discord: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScrimListingCreate(BaseModel):
    team_name: str = Field(..., max_length=100)
    contact_riot_id: str = Field(..., max_length=100)
    discord: str | None = Field(None, max_length=100)
    rank_range: str | None = Field(None, max_length=50)
    formats: list[str] = Field(default_factory=list)
    availability: list[str] = Field(default_factory=list)
    notes: str | None = Field(None, max_length=280)


class ScrimListingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    team_name: str
    contact_riot_id: str
    discord: str | None
    rank_range: str | None
    formats: list[str]
    availability: list[str]
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClashTournament(BaseModel):
    id: str
    theme_id: int
    name_key: str
    name_key_secondary: str
    schedule: list[ClashTournamentPhase]


class ClashTournamentPhase(BaseModel):
    id: int
    registration_time: int
    start_time: int
    cancelled: bool


ClashTournament.model_rebuild()


class PatchChange(BaseModel):
    champion: str
    type: str  # buff | nerf | adjust
    summary: str
    impact: str  # High | Med | Low


class PatchDataResponse(BaseModel):
    patch: str
    changes: list[PatchChange]
