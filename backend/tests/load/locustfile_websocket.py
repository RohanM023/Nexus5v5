"""Load test: WebSocket draft connections (E8-T10).

Simulates 200 concurrent WebSocket connections receiving draft updates.
Measures: connection success rate, message latency, connection stability.

Usage:
    locust -f backend/tests/load/locustfile_websocket.py \
        --host=http://localhost:8000 \
        --users=200 --spawn-rate=20 --run-time=5m

Note: Uses a custom WebSocket User class since Locust doesn't natively
support WebSocket load testing. Falls back to HTTP polling if WS unavailable.
"""

from __future__ import annotations

import json
import time
import uuid

from locust import HttpUser, between, events, task

try:
    import websocket  # type: ignore[import-untyped]

    HAS_WEBSOCKET = True
except ImportError:
    HAS_WEBSOCKET = False


class WebSocketDraftUser(HttpUser):
    """Simulates a user with a WebSocket connection for live draft updates."""

    wait_time = between(1, 3)

    def on_start(self) -> None:
        """Authenticate and optionally establish WebSocket connection."""
        email = f"ws-{uuid.uuid4().hex[:8]}@test.com"
        password = "WsTest123!"

        self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "display_name": "WsTestUser",
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
            token = ""

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

        self.ws = None
        if HAS_WEBSOCKET and token:
            self._connect_ws(token)

    def _connect_ws(self, token: str) -> None:
        """Establish WebSocket connection to draft live endpoint."""
        ws_host = self.host.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_host}/api/v1/draft/live/{self.session_id}?token={token}"
        start = time.time()
        try:
            self.ws = websocket.create_connection(ws_url, timeout=5)
            elapsed_ms = (time.time() - start) * 1000
            events.request.fire(
                request_type="WS",
                name="/draft/live/[id] connect",
                response_time=elapsed_ms,
                response_length=0,
                exception=None,
            )
        except Exception as e:
            elapsed_ms = (time.time() - start) * 1000
            events.request.fire(
                request_type="WS",
                name="/draft/live/[id] connect",
                response_time=elapsed_ms,
                response_length=0,
                exception=e,
            )
            self.ws = None

    @task(5)
    def receive_ws_message(self) -> None:
        """Listen for a WebSocket message (or fall back to HTTP polling)."""
        if self.ws is not None:
            start = time.time()
            try:
                self.ws.settimeout(2)
                msg = self.ws.recv()
                elapsed_ms = (time.time() - start) * 1000
                events.request.fire(
                    request_type="WS",
                    name="/draft/live/[id] recv",
                    response_time=elapsed_ms,
                    response_length=len(msg),
                    exception=None,
                )
            except Exception:
                # Timeout is expected if no updates are pending
                pass
        else:
            # Fallback: poll scores via HTTP
            self.client.get(
                f"/api/v1/draft/session/{self.session_id}/scores",
                headers=self.headers,
                name="/draft/session/[id]/scores [poll]",
            )

    @task(2)
    def send_ws_pick(self) -> None:
        """Send a pick event via WebSocket (or fall back to HTTP)."""
        import random

        pick_data = json.dumps({
            "action": "pick",
            "champion_id": random.randint(1, 170),  # noqa: S311
            "position": random.choice(  # noqa: S311
                ["top", "jungle", "mid", "bot", "support"]
            ),
        })

        if self.ws is not None:
            start = time.time()
            try:
                self.ws.send(pick_data)
                elapsed_ms = (time.time() - start) * 1000
                events.request.fire(
                    request_type="WS",
                    name="/draft/live/[id] send",
                    response_time=elapsed_ms,
                    response_length=len(pick_data),
                    exception=None,
                )
            except Exception as e:
                elapsed_ms = (time.time() - start) * 1000
                events.request.fire(
                    request_type="WS",
                    name="/draft/live/[id] send",
                    response_time=elapsed_ms,
                    response_length=0,
                    exception=e,
                )
        else:
            # Fallback: HTTP pick
            self.client.put(
                f"/api/v1/draft/session/{self.session_id}/pick",
                json={
                    "champion_id": random.randint(1, 170),  # noqa: S311
                    "position": random.choice(  # noqa: S311
                        ["top", "jungle", "mid", "bot", "support"]
                    ),
                },
                headers=self.headers,
                name="/draft/session/[id]/pick [fallback]",
            )

    def on_stop(self) -> None:
        """Close WebSocket connection on shutdown."""
        if self.ws is not None:
            try:
                self.ws.close()
            except Exception:
                pass
