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


class ComfortEntry(BaseModel):
    puuid: str
    champion_id: int
    champion_name: str
    comfort_score: float


class DraftScoresResponse(BaseModel):
    synergy_score: float
    counter_score: float
    comfort_scores: list[ComfortEntry]
    total_score: float


class ChampionSuggestion(BaseModel):
    champion_id: int
    champion_name: str
    composite_score: float
    synergy_contribution: float
    counter_contribution: float
    comfort_contribution: float
    role: str | None = None


# --- Stateless Draft Analysis (public, no auth) ---


class AnalyzeChampionEntry(BaseModel):
    champion_id: int
    champion_name: str = ""
    role: str | None = None


class AnalyzeDraftRequest(BaseModel):
    ally_champions: list[AnalyzeChampionEntry] = Field(default_factory=list)
    opponent_champions: list[AnalyzeChampionEntry] = Field(default_factory=list)
    ally_bans: list[int] = Field(default_factory=list)
    opponent_bans: list[int] = Field(default_factory=list)
    team_puuids: list[str] = Field(default_factory=list, max_length=5)
    patch: str = "16.6"


class AnalyzeDraftResponse(BaseModel):
    synergy_score: float
    counter_score: float
    comfort_scores: list[ComfortEntry]
    total_score: float
    suggestions: list[ChampionSuggestion]
