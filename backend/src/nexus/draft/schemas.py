"""Pydantic schemas for draft sessions, scores, and suggestions."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CreateDraftSessionRequest(BaseModel):
    team_id: UUID | None = None
    mode: Literal["clash", "custom", "scrim"] = "clash"
    team_puuids: list[str] = Field(default_factory=list, max_length=5)


class DraftSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    team_id: UUID | None = None
    mode: str
    draft_state: dict
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PickBanRequest(BaseModel):
    champion_id: int
    champion_name: str = ""
    side: Literal["blue", "red"]
    role: str | None = None


class DraftStateResponse(BaseModel):
    blue_picks: list[ChampionSlot]
    red_picks: list[ChampionSlot]
    blue_bans: list[int]
    red_bans: list[int]
    current_phase: str
    pick_number: int


class ChampionSlot(BaseModel):
    champion_id: int
    champion_name: str = ""
    role: str | None = None


class DraftScoresResponse(BaseModel):
    session_id: UUID
    pick_number: int
    synergy_score: float
    counter_score: float
    comfort_score: float
    total_score: float
    breakdown: ScoreBreakdown


class ScoreBreakdown(BaseModel):
    synergy_contribution: float
    counter_contribution: float
    comfort_contribution: float


class ChampionSuggestion(BaseModel):
    champion_id: int
    champion_name: str
    composite_score: float
    synergy_score: float
    counter_score: float
    comfort_score: float
    role: str | None = None


class SuggestionsResponse(BaseModel):
    session_id: UUID
    suggestions: list[ChampionSuggestion]
    pick_number: int
