"""Synergy/Counter/Comfort scoring functions and champion suggestion engine.

All scoring formulas are implemented per CLAUDE.md specification.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from nexus.config import get_settings
from nexus.shared import clickhouse as ch
from nexus.shared.redis import cache_get, cache_set

logger = logging.getLogger(__name__)


# --- Synergy Score ---


async def get_synergy_pair(
    champion_a: int,
    champion_b: int,
    patch: str,
    queue_id: int = 420,
) -> dict[str, Any]:
    """Look up precomputed synergy for a champion pair."""
    a, b = min(champion_a, champion_b), max(champion_a, champion_b)
    cache_key = f"score:synergy:{patch}:{a}:{b}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    rows = ch.query(
        """
        SELECT synergy_score, games_played, wins, avg_gold_diff
        FROM synergy_matrix
        WHERE patch = %(patch)s
          AND champion_a = %(a)s
          AND champion_b = %(b)s
          AND queue_id = %(queue_id)s
        LIMIT 1
        """,
        {"patch": patch, "a": a, "b": b, "queue_id": queue_id},
    )

    if not rows:
        result = {"synergy_score": 50.0, "games_played": 0, "confidence": 0.0}
    else:
        row = rows[0]
        result = {
            "synergy_score": float(row["synergy_score"]),
            "games_played": int(row["games_played"]),
            "confidence": min(1.0, int(row["games_played"]) / 100),
        }

    await cache_set(cache_key, result, ttl_seconds=21600)  # 6h
    return result


def compute_synergy_score(
    pair_win_rate: float, champ_a_wr: float, champ_b_wr: float, games_together: int
) -> float:
    """Synergy(A, B) = (pair_win_rate - expected_win_rate) * confidence_factor
    expected_win_rate = (wr_A + wr_B) / 2
    confidence_factor = min(1.0, games_together / 100)
    Output: normalized to 0-100
    """
    expected_wr = (champ_a_wr + champ_b_wr) / 2
    confidence = min(1.0, games_together / 100)
    raw = (pair_win_rate - expected_wr) * confidence
    return max(0.0, min(100.0, 50.0 + raw * 100.0))


async def compute_team_synergy(
    champion_ids: list[int],
    patch: str,
    queue_id: int = 420,
) -> float:
    """Average pairwise synergy for a team of champions."""
    if len(champion_ids) < 2:
        return 50.0

    total = 0.0
    count = 0
    for i in range(len(champion_ids)):
        for j in range(i + 1, len(champion_ids)):
            pair = await get_synergy_pair(champion_ids[i], champion_ids[j], patch, queue_id)
            total += pair["synergy_score"]
            count += 1

    return total / count if count > 0 else 50.0


# --- Counter Score ---


async def get_counter_matchup(
    champion: int,
    opponent: int,
    role: str,
    patch: str,
    queue_id: int = 420,
) -> dict[str, Any]:
    """Look up precomputed counter score for a champion vs opponent matchup."""
    cache_key = f"score:counter:{patch}:{champion}:{opponent}:{role}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    rows = ch.query(
        """
        SELECT counter_score, games_played, wins, avg_gold_diff
        FROM counter_matrix
        WHERE patch = %(patch)s
          AND champion = %(champion)s
          AND opponent = %(opponent)s
          AND role = %(role)s
          AND queue_id = %(queue_id)s
        LIMIT 1
        """,
        {
            "patch": patch,
            "champion": champion,
            "opponent": opponent,
            "role": role,
            "queue_id": queue_id,
        },
    )

    if not rows:
        result = {"counter_score": 0.0, "games_played": 0, "confidence": 0.0}
    else:
        row = rows[0]
        result = {
            "counter_score": float(row["counter_score"]),
            "games_played": int(row["games_played"]),
            "confidence": min(1.0, int(row["games_played"]) / 50),
        }

    await cache_set(cache_key, result, ttl_seconds=21600)  # 6h
    return result


def compute_counter_score(matchup_win_rate: float, games_in_matchup: int) -> float:
    """Counter(A vs B, role) = (matchup_win_rate - 0.5) * confidence_factor * 100
    confidence_factor = min(1.0, games_in_matchup / 50)
    Output: -100 to +100 (positive = A counters B)
    """
    confidence = min(1.0, games_in_matchup / 50)
    return (matchup_win_rate - 0.5) * confidence * 100.0


async def compute_team_counter(
    team_champions: list[dict[str, Any]],
    opponent_champions: list[dict[str, Any]],
    patch: str,
    queue_id: int = 420,
) -> float:
    """Compute how well our team counters the opponent's team.
    team_champions: [{"champion_id": int, "role": str}, ...]
    opponent_champions: [{"champion_id": int, "role": str}, ...]
    """
    if not team_champions or not opponent_champions:
        return 50.0

    total = 0.0
    count = 0

    for ally in team_champions:
        for enemy in opponent_champions:
            if ally.get("role") and enemy.get("role") and ally["role"] == enemy["role"]:
                matchup = await get_counter_matchup(
                    ally["champion_id"],
                    enemy["champion_id"],
                    ally["role"],
                    patch,
                    queue_id,
                )
                total += matchup["counter_score"]
                count += 1

    if count == 0:
        return 50.0

    avg = total / count
    return max(0.0, min(100.0, 50.0 + avg))


# --- Comfort Score ---


async def get_comfort_score(
    puuid: str,
    champion_id: int,
) -> float:
    """Retrieve precomputed comfort score from Redis cache."""
    cache_key = f"score:comfort:{puuid}:{champion_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return float(cached)
    return 50.0  # default if not computed yet


def compute_comfort(true_mastery: float, recent_form: float) -> float:
    """Comfort = 0.7 * TrueMastery + 0.3 * RecentForm
    Output: 0-100
    """
    settings = get_settings()
    raw = (
        settings.comfort_mastery_weight * true_mastery
        + settings.comfort_recent_weight * recent_form
    )
    return max(0.0, min(100.0, raw))


# --- Draft Composite Score ---


def compute_composite_score(
    synergy: float,
    counter: float,
    comfort: float,
) -> float:
    """CompositeScore = alpha * synergy + beta * counter + gamma * comfort
    Weights: alpha=0.35, beta=0.35, gamma=0.30
    Output: 0-100
    """
    settings = get_settings()
    return (
        settings.draft_synergy_weight * synergy
        + settings.draft_counter_weight * counter
        + settings.draft_comfort_weight * comfort
    )


# --- True Mastery (used by analytics, imported here for completeness) ---


def compute_true_mastery(
    games_played_norm: float,
    win_rate: float,
    avg_kda_norm: float,
    avg_cs_per_min_norm: float,
    avg_vision_score_norm: float,
    days_since_last_played: float,
) -> float:
    """TrueMastery = w1*norm(games) + w2*wr + w3*norm(kda) + w4*norm(cs)
                   + w5*norm(vision) + w6*recency_decay
    Recency decay: exp(-lambda * days_since_last_played), lambda=0.02
    Output: 0-100
    """
    settings = get_settings()
    recency = math.exp(-settings.recency_decay_lambda * days_since_last_played)

    raw = (
        settings.true_mastery_w1 * games_played_norm
        + settings.true_mastery_w2 * win_rate
        + settings.true_mastery_w3 * avg_kda_norm
        + settings.true_mastery_w4 * avg_cs_per_min_norm
        + settings.true_mastery_w5 * avg_vision_score_norm
        + settings.true_mastery_w6 * recency
    )
    return max(0.0, min(100.0, raw * 100.0))


# --- Champion Suggestion Engine ---


async def generate_suggestions(
    ally_champions: list[dict[str, Any]],
    opponent_champions: list[dict[str, Any]],
    player_puuids: list[str],
    patch: str,
    banned_champions: list[int],
    *,
    queue_id: int = 420,
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """Generate ranked champion suggestions for the next pick.

    Returns top N champions scored by composite = synergy + counter + comfort.
    """
    picked_ids = {c["champion_id"] for c in ally_champions + opponent_champions}
    unavailable = picked_ids | set(banned_champions)

    # Get all champion IDs from synergy matrix for this patch
    all_champs_rows = ch.query(
        "SELECT DISTINCT champion_a AS cid FROM synergy_matrix WHERE patch = %(patch)s "
        "UNION "
        "SELECT DISTINCT champion_b AS cid FROM synergy_matrix WHERE patch = %(patch)s",
        {"patch": patch},
    )
    all_champion_ids = [row["cid"] for row in all_champs_rows if row["cid"] not in unavailable]

    if not all_champion_ids:
        return []

    suggestions: list[dict[str, Any]] = []

    for champ_id in all_champion_ids:
        # Synergy with current allies
        test_team = [c["champion_id"] for c in ally_champions] + [champ_id]
        syn = await compute_team_synergy(test_team, patch, queue_id)

        # Counter advantage against opponents
        test_ally = ally_champions + [{"champion_id": champ_id, "role": None}]
        ctr = await compute_team_counter(test_ally, opponent_champions, patch, queue_id)

        # Average comfort across team players
        comfort_scores = []
        for puuid in player_puuids:
            c = await get_comfort_score(puuid, champ_id)
            comfort_scores.append(c)
        avg_comfort = sum(comfort_scores) / len(comfort_scores) if comfort_scores else 50.0

        composite = compute_composite_score(syn, ctr, avg_comfort)

        suggestions.append(
            {
                "champion_id": champ_id,
                "champion_name": "",
                "composite_score": round(composite, 2),
                "synergy_contribution": round(syn, 2),
                "counter_contribution": round(ctr, 2),
                "comfort_contribution": round(avg_comfort, 2),
            }
        )

    suggestions.sort(key=lambda s: s["composite_score"], reverse=True)
    return suggestions[:top_n]
