"""Unit tests for the draft scoring engine (synergy, counter, comfort, composite)."""

from __future__ import annotations

import math

import pytest

from nexus.draft.engine import (
    compute_comfort,
    compute_composite_score,
    compute_counter_score,
    compute_synergy_score,
    compute_true_mastery,
)


class TestSynergyScore:
    """Tests for compute_synergy_score per CLAUDE.md formula."""

    def test_equal_win_rates_zero_delta(self):
        """When pair_wr == expected_wr, synergy should be ~50 (neutral)."""
        score = compute_synergy_score(
            pair_win_rate=0.50, champ_a_wr=0.50, champ_b_wr=0.50, games_together=100
        )
        assert score == pytest.approx(50.0, abs=0.1)

    def test_positive_synergy(self):
        """When pair_wr > expected_wr, synergy should be > 50."""
        score = compute_synergy_score(
            pair_win_rate=0.60, champ_a_wr=0.50, champ_b_wr=0.50, games_together=100
        )
        assert score > 50.0

    def test_negative_synergy(self):
        """When pair_wr < expected_wr, synergy should be < 50."""
        score = compute_synergy_score(
            pair_win_rate=0.40, champ_a_wr=0.50, champ_b_wr=0.50, games_together=100
        )
        assert score < 50.0

    def test_confidence_scales_with_games(self):
        """Lower game count should reduce the magnitude of the synergy score."""
        high_conf = compute_synergy_score(
            pair_win_rate=0.60, champ_a_wr=0.50, champ_b_wr=0.50, games_together=100
        )
        low_conf = compute_synergy_score(
            pair_win_rate=0.60, champ_a_wr=0.50, champ_b_wr=0.50, games_together=10
        )
        # Same delta, but low_conf should be closer to 50 (less confident)
        assert abs(high_conf - 50.0) > abs(low_conf - 50.0)

    def test_zero_games_returns_neutral(self):
        """With zero games, confidence=0, so score should be exactly 50."""
        score = compute_synergy_score(
            pair_win_rate=0.70, champ_a_wr=0.50, champ_b_wr=0.50, games_together=0
        )
        assert score == pytest.approx(50.0)

    def test_clamped_to_0_100(self):
        """Score should never exceed [0, 100]."""
        score = compute_synergy_score(
            pair_win_rate=1.0, champ_a_wr=0.0, champ_b_wr=0.0, games_together=200
        )
        assert 0.0 <= score <= 100.0

    def test_asymmetric_expected(self):
        """Expected WR is the average of both champions' WRs."""
        score = compute_synergy_score(
            pair_win_rate=0.55, champ_a_wr=0.60, champ_b_wr=0.40, games_together=100
        )
        # expected_wr = 0.50, delta = 0.05
        assert score > 50.0


class TestCounterScore:
    """Tests for compute_counter_score per CLAUDE.md formula."""

    def test_even_matchup(self):
        """50% win rate → counter_score ~0."""
        score = compute_counter_score(matchup_win_rate=0.50, games_in_matchup=50)
        assert score == pytest.approx(0.0)

    def test_winning_matchup(self):
        """Win rate > 50% → positive counter score."""
        score = compute_counter_score(matchup_win_rate=0.60, games_in_matchup=50)
        assert score > 0.0

    def test_losing_matchup(self):
        """Win rate < 50% → negative counter score."""
        score = compute_counter_score(matchup_win_rate=0.40, games_in_matchup=50)
        assert score < 0.0

    def test_range_is_negative_100_to_100(self):
        """Output range should be [-100, +100]."""
        best = compute_counter_score(matchup_win_rate=1.0, games_in_matchup=100)
        worst = compute_counter_score(matchup_win_rate=0.0, games_in_matchup=100)
        assert best == pytest.approx(50.0)
        assert worst == pytest.approx(-50.0)

    def test_confidence_factor(self):
        """Low game count should reduce magnitude."""
        high_conf = compute_counter_score(matchup_win_rate=0.60, games_in_matchup=50)
        low_conf = compute_counter_score(matchup_win_rate=0.60, games_in_matchup=5)
        assert abs(high_conf) > abs(low_conf)

    def test_zero_games(self):
        """Zero games → zero counter score regardless of win rate."""
        score = compute_counter_score(matchup_win_rate=0.80, games_in_matchup=0)
        assert score == pytest.approx(0.0)


class TestComfortScore:
    """Tests for compute_comfort per CLAUDE.md formula."""

    def test_basic_comfort(self):
        """Comfort = 0.7 * TrueMastery + 0.3 * RecentForm."""
        score = compute_comfort(true_mastery=80.0, recent_form=60.0)
        expected = 0.7 * 80.0 + 0.3 * 60.0  # = 74.0
        assert score == pytest.approx(expected)

    def test_clamped_to_0_100(self):
        """Score should be clamped to [0, 100]."""
        assert compute_comfort(true_mastery=150.0, recent_form=150.0) <= 100.0
        assert compute_comfort(true_mastery=-10.0, recent_form=-10.0) >= 0.0

    def test_zero_inputs(self):
        """Zero mastery and form → zero comfort."""
        assert compute_comfort(true_mastery=0.0, recent_form=0.0) == pytest.approx(0.0)


class TestCompositeScore:
    """Tests for compute_composite_score per CLAUDE.md formula."""

    def test_equal_weights(self):
        """All equal scores should produce a predictable composite."""
        score = compute_composite_score(synergy=60.0, counter=60.0, comfort=60.0)
        # 0.35*60 + 0.35*60 + 0.30*60 = 60
        assert score == pytest.approx(60.0)

    def test_weights_sum_correctly(self):
        """Verify the weight contributions."""
        score = compute_composite_score(synergy=100.0, counter=0.0, comfort=0.0)
        assert score == pytest.approx(35.0)

        score = compute_composite_score(synergy=0.0, counter=100.0, comfort=0.0)
        assert score == pytest.approx(35.0)

        score = compute_composite_score(synergy=0.0, counter=0.0, comfort=100.0)
        assert score == pytest.approx(30.0)


class TestTrueMastery:
    """Tests for compute_true_mastery per CLAUDE.md formula."""

    def test_all_max_values(self):
        """Max normalized inputs should produce high mastery."""
        score = compute_true_mastery(
            games_played_norm=1.0,
            win_rate=1.0,
            avg_kda_norm=1.0,
            avg_cs_per_min_norm=1.0,
            avg_vision_score_norm=1.0,
            days_since_last_played=0.0,
        )
        assert score > 80.0
        assert score <= 100.0

    def test_all_zero_values(self):
        """Zero inputs except days → low mastery."""
        score = compute_true_mastery(
            games_played_norm=0.0,
            win_rate=0.0,
            avg_kda_norm=0.0,
            avg_cs_per_min_norm=0.0,
            avg_vision_score_norm=0.0,
            days_since_last_played=365.0,
        )
        assert score >= 0.0
        assert score < 10.0

    def test_recency_decay(self):
        """Playing recently should yield higher score than long ago."""
        recent = compute_true_mastery(
            games_played_norm=0.5,
            win_rate=0.5,
            avg_kda_norm=0.5,
            avg_cs_per_min_norm=0.5,
            avg_vision_score_norm=0.5,
            days_since_last_played=0.0,
        )
        old = compute_true_mastery(
            games_played_norm=0.5,
            win_rate=0.5,
            avg_kda_norm=0.5,
            avg_cs_per_min_norm=0.5,
            avg_vision_score_norm=0.5,
            days_since_last_played=180.0,
        )
        assert recent > old

    def test_recency_formula(self):
        """Recency decay should follow exp(-lambda * days), lambda=0.02."""
        # At 0 days, recency = 1.0
        # At ~35 days, recency = exp(-0.7) ≈ 0.497
        score_0d = compute_true_mastery(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
        score_35d = compute_true_mastery(0.0, 0.0, 0.0, 0.0, 0.0, 35.0)
        # Only recency component (w6=0.15) contributes
        # score_0d = 0.15 * 1.0 * 100 = 15.0
        # score_35d = 0.15 * exp(-0.7) * 100 ≈ 7.45
        assert score_0d == pytest.approx(15.0, abs=0.1)
        assert score_35d == pytest.approx(0.15 * math.exp(-0.02 * 35) * 100.0, abs=0.1)

    def test_clamped_to_0_100(self):
        """Score is always in [0, 100]."""
        score = compute_true_mastery(1.0, 1.0, 1.0, 1.0, 1.0, 0.0)
        assert 0.0 <= score <= 100.0
