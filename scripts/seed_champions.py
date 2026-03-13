"""Fetch champion data from Riot Data Dragon and populate Redis.

Usage:
    python scripts/seed_champions.py
    python scripts/seed_champions.py redis://custom-host:6379/0

Redis key patterns:
    champion:by_id:{champion_id}   -> JSON {id, key, name, title, tags, image_url}
    champion:by_name:{name_lower}  -> champion_id
    champion:all                   -> JSON list of all champions
    champion:version               -> DDragon version string
"""

from __future__ import annotations

import asyncio
import json
import sys

import httpx
import redis.asyncio as aioredis
import structlog

DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
DDRAGON_CHAMPIONS_URL = (
    "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json"
)
DDRAGON_ICON_URL = (
    "https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{filename}"
)

DEFAULT_REDIS_URL = "redis://localhost:6379/0"
CHAMPION_TTL = 86400 * 7  # 7 days

log = structlog.get_logger()


async def get_latest_version(client: httpx.AsyncClient) -> str:
    """Fetch the latest DDragon version."""
    resp = await client.get(DDRAGON_VERSIONS_URL)
    resp.raise_for_status()
    versions: list[str] = resp.json()
    return versions[0]


async def fetch_champions(
    client: httpx.AsyncClient, version: str
) -> dict[str, dict[str, object]]:
    """Fetch all champion data from DDragon."""
    url = DDRAGON_CHAMPIONS_URL.format(version=version)
    resp = await client.get(url)
    resp.raise_for_status()
    data: dict[str, object] = resp.json()
    return data["data"]  # type: ignore[return-value]


async def seed_redis(
    redis_client: aioredis.Redis,  # type: ignore[type-arg]
    version: str,
    champions: dict[str, dict[str, object]],
) -> int:
    """Populate Redis with champion data."""
    pipe = redis_client.pipeline()

    all_champions: list[dict[str, object]] = []

    for _key, champ in champions.items():
        champion_id = int(champ["key"])  # type: ignore[arg-type]
        image_filename: str = champ["image"]["full"]  # type: ignore[index]
        image_url = DDRAGON_ICON_URL.format(version=version, filename=image_filename)

        champion_data: dict[str, object] = {
            "id": champion_id,
            "key": champ["id"],
            "name": champ["name"],
            "title": champ["title"],
            "tags": champ["tags"],
            "image_url": image_url,
        }

        serialized = json.dumps(champion_data)

        # Map by numeric ID
        pipe.set(
            f"champion:by_id:{champion_id}",
            serialized,
            ex=CHAMPION_TTL,
        )

        # Map by lowercase name for lookups
        champ_name: str = champ["name"]  # type: ignore[assignment]
        pipe.set(
            f"champion:by_name:{champ_name.lower()}",
            str(champion_id),
            ex=CHAMPION_TTL,
        )

        all_champions.append(champion_data)

    # Store full list
    pipe.set("champion:all", json.dumps(all_champions), ex=CHAMPION_TTL)

    # Store version
    pipe.set("champion:version", version, ex=CHAMPION_TTL)

    await pipe.execute()
    return len(all_champions)


async def main() -> None:
    structlog.configure(
        processors=[
            structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(0),
    )

    redis_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_REDIS_URL

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            log.info("Fetching latest DDragon version")
            version = await get_latest_version(http_client)
            log.info("Resolved DDragon version", version=version)

            log.info("Fetching champion data from DDragon")
            champions = await fetch_champions(http_client, version)
            log.info("Fetched champions from DDragon", count=len(champions))
    except httpx.HTTPStatusError as exc:
        log.error(
            "DDragon API returned an error",
            status_code=exc.response.status_code,
            url=str(exc.request.url),
        )
        sys.exit(1)
    except httpx.RequestError as exc:
        log.error(
            "Failed to connect to DDragon API",
            error=str(exc),
            url=str(exc.request.url),
        )
        sys.exit(1)

    redis_client: aioredis.Redis = aioredis.from_url(  # type: ignore[type-arg]
        redis_url, decode_responses=True
    )
    try:
        count = await seed_redis(redis_client, version, champions)
        log.info("Champion seeding complete", count=count, version=version)
    except aioredis.RedisError as exc:
        log.error("Redis error during seeding", error=str(exc))
        sys.exit(1)
    finally:
        await redis_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
