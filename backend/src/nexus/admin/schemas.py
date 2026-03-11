"""Pydantic schemas for admin endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class RiotQuotaResponse(BaseModel):
    per_second_limit: int
    per_2min_limit: int
    estimated_usage: str


class SynergyRebuildResponse(BaseModel):
    status: str
    message: str
