"""True Mastery and Comfort score computation.

Formulas per CLAUDE.md:

TrueMastery = w1*norm(games) + w2*wr + w3*norm(kda) + w4*norm(cs/min)
             + w5*norm(vision) + w6*recency_decay
recency_decay = exp(-lambda * days_since_last_played)
Output: 0-100

Comfort = 0.7 * TrueMastery + 0.3 * RecentForm
RecentForm = win_rate_last_20 * (1 + norm(kda_trend))
Output: 0-100
"""

from __future__ import annotations

import math

from nexus.config import get_settings


def _min_max_normalize(value: float, min_val: float, max_val: float) -> float:
    """Min-max normalize a value to [0, 1]."""
    if max_val <= min_val:
        return 0.0
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def compute_true_mastery(
    games_played: int,
    win_rate: float,
    avg_kda: float,
    avg_cs_per_min: float,
    avg_vision_score: float,
    days_since_last_played: float,
    *,
    pool_stats: dict | None = None,
) -> float:
    """Compute True Mastery score for a champion.

    pool_stats is used for min-max normalization within the player's pool.
    Keys: games_min, games_max, kda_min, kda_max, cs_min, cs_max,
          vision_min, vision_max
    """
    settings = get_settings()

    if pool_stats:
        games_norm = _min_max_normalize(
            games_played,
            pool_stats.get("games_min", 0),
            pool_stats.get("games_max", 1),
        )
        kda_norm = _min_max_normalize(
            avg_kda,
            pool_stats.get("kda_min", 0),
            pool_stats.get("kda_max", 1),
        )
        cs_norm = _min_max_normalize(
            avg_cs_per_min,
            pool_stats.get("cs_min", 0),
            pool_stats.get("cs_max", 1),
        )
        vision_norm = _min_max_normalize(
            avg_vision_score,
            pool_stats.get("vision_min", 0),
            pool_stats.get("vision_max", 1),
        )
    else:
        games_norm = min(1.0, games_played / 100)
        kda_norm = min(1.0, avg_kda / 10.0)
        cs_norm = min(1.0, avg_cs_per_min / 10.0)
        vision_norm = min(1.0, avg_vision_score / 50.0)

    recency = math.exp(-settings.recency_decay_lambda * days_since_last_played)

    raw = (
        settings.true_mastery_w1 * games_norm
        + settings.true_mastery_w2 * win_rate
        + settings.true_mastery_w3 * kda_norm
        + settings.true_mastery_w4 * cs_norm
        + settings.true_mastery_w5 * vision_norm
        + settings.true_mastery_w6 * recency
    )
    return max(0.0, min(100.0, raw * 100.0))


def compute_comfort(true_mastery: float, recent_form: float) -> float:
    """Compute Comfort score.

    Comfort = 0.7 * TrueMastery + 0.3 * RecentForm
    """
    settings = get_settings()
    raw = (
        settings.comfort_mastery_weight * true_mastery
        + settings.comfort_recent_weight * recent_form
    )
    return max(0.0, min(100.0, raw))


def compute_recent_form(
    win_rate_last_20: float,
    kda_trend_norm: float,
) -> float:
    """Compute RecentForm sub-score.

    RecentForm = win_rate_last_20 * (1 + norm(kda_trend))
    Output: 0-100
    """
    raw = win_rate_last_20 * (1.0 + kda_trend_norm)
    return max(0.0, min(100.0, raw * 100.0))


def assign_tier(true_mastery: float) -> str:
    """Assign a tier based on True Mastery score."""
    if true_mastery >= 80:
        return "S"
    if true_mastery >= 60:
        return "A"
    if true_mastery >= 40:
        return "B"
    return "C"
