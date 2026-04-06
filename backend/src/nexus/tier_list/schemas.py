"""Pydantic schemas for tier list endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

PickRate = Literal["High", "Med", "Low"]
Tier = Literal["S", "A", "B", "C", "D"]
Role = Literal["Top", "Jungle", "Mid", "Bot", "Support"]


class TierEntry(BaseModel):
    name: str
    roles: list[Role]
    tier: Tier
    why: str
    pickRate: PickRate


class TierListResponse(BaseModel):
    patch: str
    updated_at: str
    entries: list[TierEntry]


class UpsertTierListRequest(BaseModel):
    patch: str
    updated_at: str
    entries: list[TierEntry]
