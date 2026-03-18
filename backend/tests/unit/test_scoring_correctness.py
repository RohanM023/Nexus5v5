"""Scoring correctness validation with hand-calculated test cases (E8-T11).

Each test includes the explicit formula computation in its docstring
so correctness can be verified manually.
"""

from __future__ import annotations

import math
import os

import pytest

# Ensure test settings are available
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("RIOT_API_KEY", "RGAPI-test-key")

from nexus.draft.engine import (
    compute_comfort,
    compute_composite_score,
    compute_counter_score,
    compute_synergy_score,
    compute_true_mastery,
)


# --- Synergy Score Tests ---
# Formula: raw = (pair_wr - (wr_A + wr_B)/2) * min(1.0, games/100)
#          output = max(0, min(100, 50 + raw * 100))


class TestSynergyScore:
    def test_synergy_full_confidence(self) -> None:
        """pair_wr=0.55, champ_a_wr=0.50, champ_b_wr=0.52, games=100.
        expected_wr = (0.50 + 0.52) / 2 = 0.51
        confidence = min(1.0, 100/100) = 1.0
        raw = (0.55 - 0.51) * 1.0 = 0.04
        output = 50 + 0.04 * 100 = 54.0
        """
        result = compute_synergy_score(0.55, 0.50, 0.52, 100)
        assert result == pytest.approx(54.0, abs=0.01)

    def test_synergy_low_confidence(self) -> None:
        """pair_wr=0.60, champ_a_wr=0.50, champ_b_wr=0.50, games=25.
        expected_wr = 0.50
        confidence = min(1.0, 25/100) = 0.25
        raw = (0.60 - 0.50) * 0.25 = 0.025
        output = 50 + 0.025 * 100 = 52.5
        """
        result = compute_synergy_score(0.60, 0.50, 0.50, 25)
        assert result == pytest.approx(52.5, abs=0.01)

    def test_synergy_negative(self) -> None:
        """pair_wr=0.40, champ_a_wr=0.52, champ_b_wr=0.48, games=80.
        expected_wr = (0.52 + 0.48) / 2 = 0.50
        confidence = min(1.0, 80/100) = 0.80
        raw = (0.40 - 0.50) * 0.80 = -0.08
        output = 50 + (-0.08) * 100 = 42.0
        """
        result = compute_synergy_score(0.40, 0.52, 0.48, 80)
        assert result == pytest.approx(42.0, abs=0.01)

    def test_synergy_clamped_to_zero(self) -> None:
        """pair_wr=0.0, champ_a_wr=0.50, champ_b_wr=0.50, games=100.
        expected_wr = 0.50
        confidence = 1.0
        raw = (0.0 - 0.50) * 1.0 = -0.50
        output = 50 + (-0.50) * 100 = 0.0 (clamped from -50)
        """
        result = compute_synergy_score(0.0, 0.50, 0.50, 100)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_synergy_clamped_to_100(self) -> None:
        """pair_wr=1.0, champ_a_wr=0.50, champ_b_wr=0.50, games=100.
        expected_wr = 0.50
        confidence = 1.0
        raw = (1.0 - 0.50) * 1.0 = 0.50
        output = 50 + 0.50 * 100 = 100.0
        """
        result = compute_synergy_score(1.0, 0.50, 0.50, 100)
        assert result == pytest.approx(100.0, abs=0.01)

    def test_synergy_zero_games(self) -> None:
        """games=0 → confidence=0 → output=50 (neutral)."""
        result = compute_synergy_score(0.80, 0.50, 0.50, 0)
        assert result == pytest.approx(50.0, abs=0.01)


# --- Counter Score Tests ---
# Formula: (matchup_wr - 0.5) * min(1.0, games/50) * 100
# Output: -100 to +100


class TestCounterScore:
    def test_counter_positive(self) -> None:
        """matchup_wr=0.60, games=50.
        confidence = min(1.0, 50/50) = 1.0
        output = (0.60 - 0.5) * 1.0 * 100 = 10.0
        """
        result = compute_counter_score(0.60, 50)
        assert result == pytest.approx(10.0, abs=0.01)

    def test_counter_negative(self) -> None:
        """matchup_wr=0.35, games=100.
        confidence = min(1.0, 100/50) = 1.0
        output = (0.35 - 0.5) * 1.0 * 100 = -15.0
        """
        result = compute_counter_score(0.35, 100)
        assert result == pytest.approx(-15.0, abs=0.01)

    def test_counter_low_confidence(self) -> None:
        """matchup_wr=0.70, games=10.
        confidence = min(1.0, 10/50) = 0.2
        output = (0.70 - 0.5) * 0.2 * 100 = 4.0
        """
        result = compute_counter_score(0.70, 10)
        assert result == pytest.approx(4.0, abs=0.01)

    def test_counter_neutral(self) -> None:
        """matchup_wr=0.50, games=50 → 0.0."""
        result = compute_counter_score(0.50, 50)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_counter_zero_games(self) -> None:
        """games=0 → confidence=0 → 0.0."""
        result = compute_counter_score(0.80, 0)
        assert result == pytest.approx(0.0, abs=0.01)


# --- True Mastery Tests ---
# Formula: (w1*games + w2*wr + w3*kda + w4*cs + w5*vision + w6*recency) * 100
# Weights: 0.25, 0.25, 0.15, 0.10, 0.10, 0.15
# Recency: exp(-0.02 * days)


class TestTrueMastery:
    def test_all_max_no_decay(self) -> None:
        """All inputs=1.0, days=0 → recency=exp(0)=1.0.
        raw = 0.25*1 + 0.25*1 + 0.15*1 + 0.10*1 + 0.10*1 + 0.15*1
            = 0.25+0.25+0.15+0.10+0.10+0.15 = 1.0
        output = 1.0 * 100 = 100.0
        """
        result = compute_true_mastery(1.0, 1.0, 1.0, 1.0, 1.0, 0)
        assert result == pytest.approx(100.0, abs=0.01)

    def test_with_recency_decay(self) -> None:
        """All inputs=1.0, days=30.
        recency = exp(-0.02 * 30) = exp(-0.6) ≈ 0.5488
        raw = 0.25+0.25+0.15+0.10+0.10 + 0.15*0.5488
            = 0.85 + 0.08232 = 0.93232
        output = 93.23
        """
        expected_recency = math.exp(-0.02 * 30)
        expected = (0.25 + 0.25 + 0.15 + 0.10 + 0.10 + 0.15 * expected_recency) * 100
        result = compute_true_mastery(1.0, 1.0, 1.0, 1.0, 1.0, 30)
        assert result == pytest.approx(expected, abs=0.1)

    def test_all_zero(self) -> None:
        """All inputs=0, days=365.
        recency = exp(-0.02*365) ≈ 0.00068
        raw = 0 + 0 + 0 + 0 + 0 + 0.15*0.00068 ≈ 0.0001
        output ≈ 0.01 (effectively 0)
        """
        result = compute_true_mastery(0.0, 0.0, 0.0, 0.0, 0.0, 365)
        assert result == pytest.approx(0.0, abs=0.1)

    def test_mixed_values(self) -> None:
        """games=0.8, wr=0.6, kda=0.5, cs=0.7, vision=0.4, days=10.
        recency = exp(-0.02*10) = exp(-0.2) ≈ 0.8187
        raw = 0.25*0.8 + 0.25*0.6 + 0.15*0.5 + 0.10*0.7 + 0.10*0.4 + 0.15*0.8187
            = 0.20 + 0.15 + 0.075 + 0.07 + 0.04 + 0.12281
            = 0.65781
        output ≈ 65.78
        """
        expected_recency = math.exp(-0.02 * 10)
        expected = (
            0.25 * 0.8
            + 0.25 * 0.6
            + 0.15 * 0.5
            + 0.10 * 0.7
            + 0.10 * 0.4
            + 0.15 * expected_recency
        ) * 100
        result = compute_true_mastery(0.8, 0.6, 0.5, 0.7, 0.4, 10)
        assert result == pytest.approx(expected, abs=0.1)


# --- Comfort Score Tests ---
# Formula: 0.7 * true_mastery + 0.3 * recent_form, clamped to [0, 100]


class TestComfortScore:
    def test_basic_comfort(self) -> None:
        """mastery=80, recent_form=60.
        output = 0.7*80 + 0.3*60 = 56 + 18 = 74.0
        """
        result = compute_comfort(80.0, 60.0)
        assert result == pytest.approx(74.0, abs=0.01)

    def test_comfort_max(self) -> None:
        """mastery=100, recent_form=100.
        output = 0.7*100 + 0.3*100 = 100.0
        """
        result = compute_comfort(100.0, 100.0)
        assert result == pytest.approx(100.0, abs=0.01)

    def test_comfort_zero(self) -> None:
        """mastery=0, recent_form=0 → 0.0."""
        result = compute_comfort(0.0, 0.0)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_comfort_high_mastery_low_form(self) -> None:
        """mastery=90, recent_form=20.
        output = 0.7*90 + 0.3*20 = 63 + 6 = 69.0
        """
        result = compute_comfort(90.0, 20.0)
        assert result == pytest.approx(69.0, abs=0.01)


# --- Composite Draft Score Tests ---
# Formula: 0.35*synergy + 0.35*counter + 0.30*comfort


class TestCompositeScore:
    def test_balanced(self) -> None:
        """synergy=70, counter=60, comfort=80.
        output = 0.35*70 + 0.35*60 + 0.30*80
               = 24.5 + 21.0 + 24.0 = 69.5
        """
        result = compute_composite_score(70.0, 60.0, 80.0)
        assert result == pytest.approx(69.5, abs=0.01)

    def test_all_max(self) -> None:
        """All 100 → 0.35*100 + 0.35*100 + 0.30*100 = 100.0."""
        result = compute_composite_score(100.0, 100.0, 100.0)
        assert result == pytest.approx(100.0, abs=0.01)

    def test_all_zero(self) -> None:
        """All 0 → 0.0."""
        result = compute_composite_score(0.0, 0.0, 0.0)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_synergy_dominant(self) -> None:
        """synergy=100, counter=0, comfort=0.
        output = 0.35*100 = 35.0
        """
        result = compute_composite_score(100.0, 0.0, 0.0)
        assert result == pytest.approx(35.0, abs=0.01)

    def test_comfort_dominant(self) -> None:
        """synergy=0, counter=0, comfort=100.
        output = 0.30*100 = 30.0
        """
        result = compute_composite_score(0.0, 0.0, 100.0)
        assert result == pytest.approx(30.0, abs=0.01)
