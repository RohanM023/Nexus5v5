"""Service layer for community features."""

from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from nexus.community.models import FindListing, ScrimListing
from nexus.community import schemas


async def get_find_listings(db: AsyncSession) -> list[FindListing]:
    result = await db.execute(select(FindListing).order_by(FindListing.updated_at.desc()))
    return list(result.scalars().all())


async def upsert_find_listing(
    db: AsyncSession, user_id: uuid.UUID, data: schemas.FindListingCreate
) -> FindListing:
    result = await db.execute(select(FindListing).where(FindListing.user_id == user_id))
    listing = result.scalar_one_or_none()
    if listing:
        listing.riot_id = data.riot_id
        listing.roles = data.roles
        listing.rank = data.rank
        listing.champions = data.champions
        listing.discord = data.discord
        listing.notes = data.notes
    else:
        listing = FindListing(
            user_id=user_id,
            riot_id=data.riot_id,
            roles=data.roles,
            rank=data.rank,
            champions=data.champions,
            discord=data.discord,
            notes=data.notes,
        )
        db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing


async def delete_find_listing(db: AsyncSession, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        delete(FindListing).where(FindListing.user_id == user_id).returning(FindListing.id)
    )
    await db.commit()
    return result.rowcount > 0


async def get_scrim_listings(db: AsyncSession) -> list[ScrimListing]:
    result = await db.execute(select(ScrimListing).order_by(ScrimListing.updated_at.desc()))
    return list(result.scalars().all())


async def upsert_scrim_listing(
    db: AsyncSession, user_id: uuid.UUID, data: schemas.ScrimListingCreate
) -> ScrimListing:
    result = await db.execute(select(ScrimListing).where(ScrimListing.user_id == user_id))
    listing = result.scalar_one_or_none()
    if listing:
        listing.team_name = data.team_name
        listing.contact_riot_id = data.contact_riot_id
        listing.discord = data.discord
        listing.rank_range = data.rank_range
        listing.formats = data.formats
        listing.availability = data.availability
        listing.notes = data.notes
    else:
        listing = ScrimListing(
            user_id=user_id,
            team_name=data.team_name,
            contact_riot_id=data.contact_riot_id,
            discord=data.discord,
            rank_range=data.rank_range,
            formats=data.formats,
            availability=data.availability,
            notes=data.notes,
        )
        db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing


async def delete_scrim_listing(db: AsyncSession, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        delete(ScrimListing).where(ScrimListing.user_id == user_id).returning(ScrimListing.id)
    )
    await db.commit()
    return result.rowcount > 0
