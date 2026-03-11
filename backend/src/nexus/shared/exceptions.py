"""Custom exception hierarchy for the Nexus application."""

from __future__ import annotations

from typing import Any


class NexusError(Exception):
    """Base exception for all Nexus errors."""

    def __init__(
        self,
        message: str = "An unexpected error occurred",
        *,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class NotFoundError(NexusError):
    def __init__(
        self,
        message: str = "Resource not found",
        *,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="NOT_FOUND",
            status_code=404,
            details=details,
        )


class ValidationError(NexusError):
    def __init__(
        self,
        message: str = "Validation failed",
        *,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


class AuthError(NexusError):
    def __init__(
        self,
        message: str = "Authentication failed",
        *,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="AUTH_ERROR",
            status_code=401,
            details=details,
        )


class ForbiddenError(NexusError):
    def __init__(
        self,
        message: str = "Forbidden",
        *,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="FORBIDDEN",
            status_code=403,
            details=details,
        )


class RiotAPIError(NexusError):
    def __init__(
        self,
        message: str = "Riot API error",
        *,
        status_code: int = 502,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="RIOT_API_ERROR",
            status_code=status_code,
            details=details,
        )


class RateLimitError(NexusError):
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        *,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="RATE_LIMIT_ERROR",
            status_code=429,
            details=details,
        )


class ConflictError(NexusError):
    def __init__(
        self,
        message: str = "Resource conflict",
        *,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="CONFLICT",
            status_code=409,
            details=details,
        )
