"""Unit tests for application configuration."""

from __future__ import annotations

import os

import pytest

from nexus.config import Settings, get_settings


class TestSettings:
    """Tests for Pydantic Settings configuration."""

    def test_default_values(self):
        """Settings should have sensible defaults for local dev."""
        settings = Settings()
        assert settings.app_name == "Nexus-5v5"
        assert settings.environment in ("local", "development")
        assert settings.port == 8000

    def test_postgres_dsn(self):
        """postgres_dsn property should build a valid connection string."""
        settings = Settings(
            postgres_host="db", postgres_port=5432,
            postgres_user="user", postgres_password="pass", postgres_db="nexus"
        )
        assert settings.postgres_dsn == "postgresql+asyncpg://user:pass@db:5432/nexus"

    def test_postgres_dsn_sync(self):
        """postgres_dsn_sync should use the synchronous driver."""
        settings = Settings(
            postgres_host="db", postgres_port=5432,
            postgres_user="user", postgres_password="pass", postgres_db="nexus"
        )
        assert settings.postgres_dsn_sync == "postgresql://user:pass@db:5432/nexus"

    def test_redis_url_without_password(self):
        """Redis URL without password should not include auth."""
        settings = Settings(redis_host="localhost", redis_port=6379, redis_password="", redis_db=0)
        assert settings.redis_url == "redis://localhost:6379/0"

    def test_redis_url_with_password(self):
        """Redis URL with password should include auth."""
        settings = Settings(redis_host="localhost", redis_port=6379, redis_password="secret", redis_db=0)
        assert settings.redis_url == "redis://:secret@localhost:6379/0"

    def test_cors_origins_parsing(self):
        """CORS origins should be parsed from comma-separated string."""
        os.environ["CORS_ORIGINS"] = "http://localhost:3000,http://example.com"
        settings = Settings()
        assert settings.cors_origins == ["http://localhost:3000", "http://example.com"]
        os.environ.pop("CORS_ORIGINS", None)

    def test_cors_origins_single(self):
        """Single CORS origin should work."""
        os.environ["CORS_ORIGINS"] = "http://localhost:3000"
        settings = Settings()
        assert settings.cors_origins == ["http://localhost:3000"]
        os.environ.pop("CORS_ORIGINS", None)

    def test_jwt_secret_rejected_in_production(self):
        """Production should reject the default JWT secret."""
        with pytest.raises(ValueError, match="must be changed"):
            Settings(
                environment="production",
                jwt_secret_key="CHANGE-ME-IN-PRODUCTION",
            )

    def test_jwt_secret_accepted_in_local(self):
        """Local/dev should accept the default JWT secret."""
        settings = Settings(environment="local", jwt_secret_key="CHANGE-ME-IN-PRODUCTION")
        assert settings.jwt_secret_key == "CHANGE-ME-IN-PRODUCTION"

    def test_scoring_weights_defaults(self):
        """Scoring weights should match CLAUDE.md defaults."""
        settings = Settings()
        assert settings.true_mastery_w1 == pytest.approx(0.25)
        assert settings.true_mastery_w2 == pytest.approx(0.25)
        assert settings.true_mastery_w3 == pytest.approx(0.15)
        assert settings.true_mastery_w4 == pytest.approx(0.10)
        assert settings.true_mastery_w5 == pytest.approx(0.10)
        assert settings.true_mastery_w6 == pytest.approx(0.15)
        assert settings.recency_decay_lambda == pytest.approx(0.02)
        assert settings.comfort_mastery_weight == pytest.approx(0.70)
        assert settings.comfort_recent_weight == pytest.approx(0.30)
        assert settings.draft_synergy_weight == pytest.approx(0.35)
        assert settings.draft_counter_weight == pytest.approx(0.35)
        assert settings.draft_comfort_weight == pytest.approx(0.30)

    def test_scoring_weights_sum_to_one(self):
        """True Mastery weights should sum to 1.0."""
        settings = Settings()
        total = (
            settings.true_mastery_w1
            + settings.true_mastery_w2
            + settings.true_mastery_w3
            + settings.true_mastery_w4
            + settings.true_mastery_w5
            + settings.true_mastery_w6
        )
        assert total == pytest.approx(1.0)

    def test_draft_weights_sum_to_one(self):
        """Draft composite weights should sum to 1.0."""
        settings = Settings()
        total = (
            settings.draft_synergy_weight
            + settings.draft_counter_weight
            + settings.draft_comfort_weight
        )
        assert total == pytest.approx(1.0)
