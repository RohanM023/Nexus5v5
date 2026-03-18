"""Load test: Draft scoring endpoint (E8-T09).

Simulates 500 concurrent draft sessions requesting scores and suggestions.
Target: p99 < 200ms.

Usage:
    locust -f backend/tests/load/locustfile_draft.py \
        --host=http://localhost:8000 \
        --users=500 --spawn-rate=25 --run-time=5m
"""

from __future__ import annotations

import uuid

from locust import HttpUser, between, task


class DraftUser(HttpUser):
    """Simulates a user interacting with the draft scoring system."""

    wait_time = between(0.5, 2)

    def on_start(self) -> None:
        """Authenticate and create a draft session."""
        email = f"draft-{uuid.uuid4().hex[:8]}@test.com"
        password = "DraftTest123!"

        self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "display_name": "DraftTestUser",
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

        # Create a draft session
        resp = self.client.post(
            "/api/v1/draft/session",
            json={"mode": "clash"},
            headers=self.headers,
            name="/draft/session [create]",
        )
        if resp.status_code in (200, 201):
            self.session_id = resp.json().get("session_id", str(uuid.uuid4()))
        else:
            self.session_id = str(uuid.uuid4())

    @task(5)
    def get_scores(self) -> None:
        """GET /draft/session/{id}/scores — fetch current draft scores."""
        self.client.get(
            f"/api/v1/draft/session/{self.session_id}/scores",
            headers=self.headers,
            name="/draft/session/[id]/scores",
        )

    @task(3)
    def get_suggestions(self) -> None:
        """GET /draft/suggestions/{id} — fetch champion suggestions."""
        self.client.get(
            f"/api/v1/draft/suggestions/{self.session_id}",
            headers=self.headers,
            name="/draft/suggestions/[id]",
        )

    @task(2)
    def make_pick(self) -> None:
        """PUT /draft/session/{id}/pick — register a champion pick."""
        champion_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        import random

        self.client.put(
            f"/api/v1/draft/session/{self.session_id}/pick",
            json={
                "champion_id": random.choice(champion_ids),  # noqa: S311
                "position": random.choice(  # noqa: S311
                    ["top", "jungle", "mid", "bot", "support"]
                ),
            },
            headers=self.headers,
            name="/draft/session/[id]/pick",
        )

    @task(1)
    def make_ban(self) -> None:
        """PUT /draft/session/{id}/ban — register a champion ban."""
        import random

        self.client.put(
            f"/api/v1/draft/session/{self.session_id}/ban",
            json={"champion_id": random.randint(1, 170)},  # noqa: S311
            headers=self.headers,
            name="/draft/session/[id]/ban",
        )
