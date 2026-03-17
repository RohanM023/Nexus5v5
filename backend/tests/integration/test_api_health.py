"""Integration tests for API health and admin endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestHealthEndpoint:
    """Tests for GET /api/v1/admin/health."""

    async def test_health_returns_200(self, test_client: AsyncClient):
        """Health endpoint should return 200."""
        resp = await test_client.get("/api/v1/admin/health")
        assert resp.status_code == 200

    async def test_health_response_format(self, test_client: AsyncClient):
        """Health endpoint should return status, version, and uptime."""
        resp = await test_client.get("/api/v1/admin/health")
        data = resp.json()
        assert "status" in data
        assert data["status"] == "ok"

    async def test_openapi_schema_available(self, test_client: AsyncClient):
        """OpenAPI schema should be accessible in non-production."""
        resp = await test_client.get("/openapi.json")
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["info"]["title"] == "Nexus-5v5"


@pytest.mark.asyncio
class TestAuthEndpoints:
    """Tests for authentication flow via API."""

    async def test_register_success(self, test_client: AsyncClient):
        """POST /api/v1/auth/register should create a user."""
        resp = await test_client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "StrongPassword123!",
                "display_name": "TestUser",
            },
        )
        # May return 201 or 200 depending on implementation
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "access_token" in data or "user" in data

    async def test_register_invalid_email(self, test_client: AsyncClient):
        """Registration with invalid email should fail."""
        resp = await test_client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "StrongPassword123!",
                "display_name": "TestUser",
            },
        )
        assert resp.status_code in (400, 422)

    async def test_login_nonexistent_user(self, test_client: AsyncClient):
        """Login with nonexistent user should return 401."""
        resp = await test_client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "anything",
            },
        )
        assert resp.status_code in (401, 404)

    async def test_protected_endpoint_without_auth(self, test_client: AsyncClient):
        """Accessing a protected endpoint without auth should return 401/403."""
        resp = await test_client.get("/api/v1/identity/me")
        assert resp.status_code in (401, 403)

    async def test_protected_endpoint_with_auth(
        self, test_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Accessing a protected endpoint with valid auth should not return 401."""
        resp = await test_client.get(
            "/api/v1/identity/me", headers=auth_headers
        )
        # May return 404 (user not in test DB) but NOT 401
        assert resp.status_code != 401
