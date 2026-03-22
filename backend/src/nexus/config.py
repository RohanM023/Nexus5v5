"""Application configuration via Pydantic Settings."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Application ---
    app_name: str = "Nexus-5v5"
    app_version: str = "0.1.0"
    environment: Literal["development", "local", "staging", "production"] = "local"
    debug: bool = False
    log_level: str = "INFO"

    # --- Server ---
    host: str = "0.0.0.0"  # noqa: S104
    port: int = 8000

    # --- PostgreSQL ---
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "nexus"
    postgres_password: str = "nexus"  # noqa: S105
    postgres_db: str = "nexus"

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def postgres_dsn_sync(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # --- ClickHouse ---
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_db: str = "nexus"
    clickhouse_secure: bool = False
    clickhouse_verify_tls: bool = True

    # --- Redis ---
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0

    @property
    def redis_url(self) -> str:
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # --- JWT ---
    jwt_algorithm: str = "RS256"
    jwt_private_key_path: str = "keys/private.pem"
    jwt_public_key_path: str = "keys/public.pem"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    # Fallback for dev: symmetric HS256 key (only used if RS256 keys missing)
    jwt_secret_key: str = "CHANGE-ME-IN-PRODUCTION"  # noqa: S105

    # --- Riot API ---
    riot_api_key: str = ""
    riot_api_rate_limit_per_second: int = 20
    riot_api_rate_limit_per_2min: int = 100
    riot_api_timeout: float = 10.0
    riot_api_max_retries: int = 3

    # --- CORS ---
    cors_origins_str: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
        validation_alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_str.split(",") if o.strip()]

    # --- Encryption ---
    encryption_key: str = ""  # AES-256 key for identity link data

    # --- Rate Limiting ---
    auth_rate_limit_per_minute: int = 10

    @field_validator("jwt_secret_key", mode="after")
    @classmethod
    def reject_default_jwt_secret(cls, v: str, info: ValidationInfo) -> str:
        env = info.data.get("environment", "local")
        insecure_defaults = ("CHANGE-ME-IN-PRODUCTION", "change-me-to-a-random-secret")
        if env == "production" and v in insecure_defaults:
            raise ValueError("JWT_SECRET_KEY must be changed from the default value in production")
        return v

    # --- Matrix Rebuild ---
    matrix_min_games: int = 2

    # --- Scoring Weights ---
    true_mastery_w1: float = 0.25  # games_played
    true_mastery_w2: float = 0.25  # win_rate
    true_mastery_w3: float = 0.15  # avg_kda
    true_mastery_w4: float = 0.10  # avg_cs_per_min
    true_mastery_w5: float = 0.10  # avg_vision_score
    true_mastery_w6: float = 0.15  # recency_decay
    recency_decay_lambda: float = 0.02

    comfort_mastery_weight: float = 0.70
    comfort_recent_weight: float = 0.30

    draft_synergy_weight: float = 0.35
    draft_counter_weight: float = 0.35
    draft_comfort_weight: float = 0.30


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
