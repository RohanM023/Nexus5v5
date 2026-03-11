"""FastAPI router for draft session CRUD, scoring, suggestions, and WebSocket."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.draft import engine, schemas
from nexus.draft.models import DraftSession, ScoreSnapshot
from nexus.middleware.auth import get_current_user
from nexus.shared.database import get_db_session
from nexus.shared.exceptions import NotFoundError, ValidationError
from nexus.shared.redis import cache_set

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/draft", tags=["draft"])

DEFAULT_PATCH = "14.10"


# --- Draft Session CRUD ---


@router.post("/session", response_model=schemas.DraftSessionResponse, status_code=201)
async def create_session(
    body: schemas.CreateDraftSessionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> Any:
    session = DraftSession(
        user_id=current_user["user_id"],
        team_id=body.team_id,
        mode=body.mode,
        draft_state={
            "blue_picks": [],
            "red_picks": [],
            "blue_bans": [],
            "red_bans": [],
            "current_phase": "ban_1",
            "pick_number": 0,
            "team_puuids": body.team_puuids,
        },
        status="in_progress",
    )
    db.add(session)
    await db.flush()

    # Cache draft state in Redis for fast access
    await cache_set(
        f"draft:session:{session.id}",
        session.draft_state,
        ttl_seconds=3600,
    )

    return session


@router.put("/session/{session_id}/pick")
async def register_pick(
    session_id: UUID,
    body: schemas.PickBanRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    session = await _get_session(db, session_id, current_user["user_id"])
    state = session.draft_state.copy()

    side_key = f"{body.side}_picks"
    picks = state.get(side_key, [])

    if len(picks) >= 5:
        raise ValidationError(f"{body.side} side already has 5 picks")

    # Check champion is not already picked or banned
    all_picked = [p["champion_id"] for p in state.get("blue_picks", [])]
    all_picked += [p["champion_id"] for p in state.get("red_picks", [])]
    all_banned = state.get("blue_bans", []) + state.get("red_bans", [])

    if body.champion_id in all_picked or body.champion_id in all_banned:
        raise ValidationError("Champion is already picked or banned")

    picks.append(
        {
            "champion_id": body.champion_id,
            "champion_name": body.champion_name,
            "role": body.role,
        }
    )
    state[side_key] = picks
    state["pick_number"] = state.get("pick_number", 0) + 1
    state["current_phase"] = _determine_phase(state)

    session.draft_state = state
    await db.flush()
    await cache_set(f"draft:session:{session_id}", state, ttl_seconds=3600)

    return {"status": "ok", "draft_state": state}


@router.put("/session/{session_id}/ban")
async def register_ban(
    session_id: UUID,
    body: schemas.PickBanRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    session = await _get_session(db, session_id, current_user["user_id"])
    state = session.draft_state.copy()

    side_key = f"{body.side}_bans"
    bans = state.get(side_key, [])

    if len(bans) >= 5:
        raise ValidationError(f"{body.side} side already has 5 bans")

    bans.append(body.champion_id)
    state[side_key] = bans
    state["current_phase"] = _determine_phase(state)

    session.draft_state = state
    await db.flush()
    await cache_set(f"draft:session:{session_id}", state, ttl_seconds=3600)

    return {"status": "ok", "draft_state": state}


@router.get("/session/{session_id}/scores", response_model=schemas.DraftScoresResponse)
async def get_scores(
    session_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    session = await _get_session(db, session_id, current_user["user_id"])
    state = session.draft_state

    blue_picks = state.get("blue_picks", [])
    red_picks = state.get("red_picks", [])
    team_puuids = state.get("team_puuids", [])
    pick_number = state.get("pick_number", 0)

    ally_ids = [p["champion_id"] for p in blue_picks]
    synergy = await engine.compute_team_synergy(ally_ids, DEFAULT_PATCH)
    counter = await engine.compute_team_counter(blue_picks, red_picks, DEFAULT_PATCH)

    comfort_scores = []
    for puuid in team_puuids:
        for pick in blue_picks:
            c = await engine.get_comfort_score(puuid, pick["champion_id"])
            comfort_scores.append(c)
    avg_comfort = sum(comfort_scores) / len(comfort_scores) if comfort_scores else 50.0

    settings = engine.get_settings()
    total = engine.compute_composite_score(synergy, counter, avg_comfort)

    # Save snapshot
    snapshot = ScoreSnapshot(
        draft_session_id=session_id,
        pick_number=pick_number,
        total_score=total,
        synergy_score=synergy,
        counter_score=counter,
        comfort_score=avg_comfort,
    )
    db.add(snapshot)

    return {
        "session_id": session_id,
        "pick_number": pick_number,
        "synergy_score": round(synergy, 2),
        "counter_score": round(counter, 2),
        "comfort_score": round(avg_comfort, 2),
        "total_score": round(total, 2),
        "breakdown": {
            "synergy_contribution": round(settings.draft_synergy_weight * synergy, 2),
            "counter_contribution": round(settings.draft_counter_weight * counter, 2),
            "comfort_contribution": round(settings.draft_comfort_weight * avg_comfort, 2),
        },
    }


@router.get("/suggestions/{session_id}", response_model=schemas.SuggestionsResponse)
async def get_suggestions(
    session_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    session = await _get_session(db, session_id, current_user["user_id"])
    state = session.draft_state

    blue_picks = state.get("blue_picks", [])
    red_picks = state.get("red_picks", [])
    team_puuids = state.get("team_puuids", [])
    all_bans = state.get("blue_bans", []) + state.get("red_bans", [])

    suggestions = await engine.generate_suggestions(
        ally_champions=blue_picks,
        opponent_champions=red_picks,
        player_puuids=team_puuids,
        patch=DEFAULT_PATCH,
        banned_champions=all_bans,
        top_n=10,
    )

    return {
        "session_id": session_id,
        "suggestions": suggestions,
        "pick_number": state.get("pick_number", 0),
    }


# --- WebSocket ---

_active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/live/{session_id}")
async def draft_live(websocket: WebSocket, session_id: str) -> None:
    # Authenticate via query param token before accepting the connection
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        from nexus.middleware.auth import decode_token

        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await websocket.accept()
    key = session_id

    if key not in _active_connections:
        _active_connections[key] = []
    _active_connections[key].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Broadcast to all connected clients for this session
            for conn in _active_connections.get(key, []):
                if conn != websocket:
                    await conn.send_text(json.dumps(message))
    except WebSocketDisconnect:
        if key in _active_connections:
            _active_connections[key] = [c for c in _active_connections[key] if c != websocket]
            if not _active_connections[key]:
                del _active_connections[key]


# --- Helpers ---


async def _get_session(db: AsyncSession, session_id: UUID, user_id: UUID) -> DraftSession:
    result = await db.execute(
        select(DraftSession).where(
            DraftSession.id == session_id,
            DraftSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise NotFoundError("Draft session not found")
    return session


def _determine_phase(state: dict[str, Any]) -> str:
    """Determine the current draft phase based on bans/picks count."""
    blue_bans = len(state.get("blue_bans", []))
    red_bans = len(state.get("red_bans", []))
    blue_picks = len(state.get("blue_picks", []))
    red_picks = len(state.get("red_picks", []))

    total_bans = blue_bans + red_bans
    total_picks = blue_picks + red_picks

    if total_bans < 6:
        return "ban_1"
    if total_picks < 6:
        return "pick_1"
    if total_bans < 10:
        return "ban_2"
    if total_picks < 10:
        return "pick_2"
    return "complete"
