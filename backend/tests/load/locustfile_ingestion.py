"""Load test: Riot API ingestion endpoint (E8-T08).

Simulates 100 concurrent users triggering match ingestion.
Measures: throughput, error rate, latency distribution.

Usage:
    locust -f backend/tests/load/locustfile_ingestion.py \
        --host=http://localhost:8000 \
        --users=100 --spawn-rate=10 --run-time=5m
"""

from __future__ import annotations

import uuid

from locust import HttpUser, between, task


class IngestionUser(HttpUser):
    """Simulates a user triggering match ingestion jobs."""

    wait_time = between(1, 3)

    def on_start(self) -> None:
        """Authenticate and store token for subsequent requests."""
        email = f"loadtest-{uuid.uuid4().hex[:8]}@test.com"
        password = "LoadTest123!"

        self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "display_name": "LoadTestUser",
            },
            name="/auth/register",
        )
        resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
            name="/auth/login",
        )
        if resp.status_code == 200:
            token = resp.json().get("access_token", "")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(3)
    def trigger_ingestion(self) -> None:
        """POST /match/ingest/{puuid} — trigger match history ingestion."""
        test_puuid = f"test-puuid-{uuid.uuid4().hex[:12]}"
        self.client.post(
            f"/api/v1/match/ingest/{test_puuid}",
            headers=self.headers,
            name="/match/ingest/[puuid]",
        )

    @task(1)
    def get_match_history(self) -> None:
        """GET /match/history/{puuid} — read match history."""
        test_puuid = f"test-puuid-{uuid.uuid4().hex[:12]}"
        self.client.get(
            f"/api/v1/match/history/{test_puuid}",
            headers=self.headers,
            name="/match/history/[puuid]",
        )
