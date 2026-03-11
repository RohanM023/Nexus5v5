"""Cursor and offset pagination schemas."""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class OffsetPaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class CursorPaginationParams(BaseModel):
    cursor: str | None = None
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    pagination: PaginationMeta


class PaginationMeta(BaseModel):
    cursor: str | None = None
    has_more: bool = False
    total: int | None = None
    page: int | None = None
    page_size: int | None = None


def paginated_response(
    data: list[Any],
    *,
    cursor: str | None = None,
    has_more: bool = False,
    total: int | None = None,
    page: int | None = None,
    page_size: int | None = None,
) -> dict[str, Any]:
    return {
        "data": data,
        "pagination": {
            "cursor": cursor,
            "has_more": has_more,
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }
