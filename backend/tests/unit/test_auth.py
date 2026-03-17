"""Unit tests for JWT auth middleware — token creation & verification."""

from __future__ import annotations

import os
import time
from uuid import UUID, uuid4

import pytest

# Set env before importing auth module
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["RIOT_API_KEY"] = "RGAPI-test-key"

from nexus.middleware.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from nexus.shared.exceptions import AuthError


class TestTokenCreation:
    """Tests for JWT token creation."""

    def test_create_access_token(self):
        """Access token should be a valid JWT string."""
        user_id = uuid4()
        token = create_access_token(user_id)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self):
        """Refresh token should be a valid JWT string."""
        user_id = uuid4()
        token = create_refresh_token(user_id)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_access_token_contains_user_id(self):
        """Token payload should include the user ID as 'sub'."""
        user_id = uuid4()
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)

    def test_access_token_has_type(self):
        """Access token payload should have type='access'."""
        token = create_access_token(uuid4())
        payload = decode_token(token)
        assert payload["type"] == "access"

    def test_refresh_token_has_type(self):
        """Refresh token payload should have type='refresh'."""
        token = create_refresh_token(uuid4())
        payload = decode_token(token)
        assert payload["type"] == "refresh"

    def test_access_token_has_expiry(self):
        """Access token should have an 'exp' claim."""
        token = create_access_token(uuid4())
        payload = decode_token(token)
        assert "exp" in payload

    def test_access_token_extra_claims(self):
        """Extra claims should be included in the token payload."""
        user_id = uuid4()
        token = create_access_token(user_id, extra_claims={"role": "admin"})
        payload = decode_token(token)
        assert payload["role"] == "admin"


class TestTokenDecoding:
    """Tests for JWT token decoding and verification."""

    def test_decode_valid_token(self):
        """Valid token should decode successfully."""
        user_id = uuid4()
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)

    def test_decode_invalid_token(self):
        """Invalid token should raise AuthError."""
        with pytest.raises(AuthError, match="Invalid or expired token"):
            decode_token("not-a-valid-jwt-token")

    def test_decode_tampered_token(self):
        """Tampered token should raise AuthError."""
        token = create_access_token(uuid4())
        # Tamper with the payload
        parts = token.split(".")
        parts[1] = parts[1][::-1]  # reverse the payload
        tampered = ".".join(parts)
        with pytest.raises(AuthError):
            decode_token(tampered)

    def test_different_users_get_different_tokens(self):
        """Two different users should get different tokens."""
        token1 = create_access_token(uuid4())
        token2 = create_access_token(uuid4())
        assert token1 != token2


class TestTokenRoundTrip:
    """Tests for full encode → decode cycles."""

    def test_access_token_roundtrip(self):
        """Encode → decode should preserve user_id and type."""
        user_id = uuid4()
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert UUID(payload["sub"]) == user_id
        assert payload["type"] == "access"

    def test_refresh_token_roundtrip(self):
        """Encode → decode should preserve user_id and type."""
        user_id = uuid4()
        token = create_refresh_token(user_id)
        payload = decode_token(token)
        assert UUID(payload["sub"]) == user_id
        assert payload["type"] == "refresh"
