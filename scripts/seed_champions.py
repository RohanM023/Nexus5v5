"""Fetch champion data from Riot Data Dragon and populate Redis.

Usage:
    python scripts/seed_champions.py

Redis key patterns:
    champion:by_id:{champion_id}   -> JSON {id, key, name, title, image}
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

DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
DDRAGON_CHAMPIONS_URL = (
    "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json"
)

REDIS_URL = "redis://localhost:6379/0"
CHAMPION_TTL = 86400 * 7  # 7 days


async def get_latest_version(client: httpx.AsyncClient) -> str:
    """Fetch the latest DDragon version."""
    resp = await client.get(DDRAGON_VERSIONS_URL)
    resp.raise_for_status()
    versions: list[str] = resp.json()
    return versions[0]


async def fetch_champions(
    client: httpx.AsyncClient, version: str
) -> dict[str, dict]:
    """Fetch all champion data from DDragon."""
    url = DDRAGON_CHAMPIONS_URL.format(version=version)
    resp = await client.get(url)
    resp.raise_for_status()
    data = resp.json()
    return data["data"]


async def seed_redis(redis_client: aioredis.Redis, version: str, champions: dict[str, dict]) -> int:
    """Populate Redis with champion data."""
    pipe = redis_client.pipeline()

    all_champions: list[dict] = []

    for _key, champ in champions.items():
        champion_id = int(champ["key"])
        champion_data = {
            "id": champion_id,
            "key": champ["id"],
            "name": champ["name"],
            "title": champ["title"],
            "image": champ["image"]["full"],
            "tags": champ["tags"],
        }

        serialized = json.dumps(champion_data)

        # Map by numeric ID
        pipe.set(
            f"champion:by_id:{champion_id}",
            serialized,
            ex=CHAMPION_TTL,
        )

        # Map by lowercase name for lookups
        pipe.set(
            f"champion:by_name:{champ['name'].lower()}",
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
    redis_url = sys.argv[1] if len(sys.argv) > 1 else REDIS_URL

    async with httpx.AsyncClient(timeout=30.0) as http_client:
        print("Fetching latest DDragon version...")
        version = await get_latest_version(http_client)
        print(f"  Version: {version}")

        print("Fetching champion data...")
        champions = await fetch_champions(http_client, version)
        print(f"  Found {len(champions)} champions")

    redis_client = aioredis.from_url(redis_url, decode_responses=True)
    try:
        count = await seed_redis(redis_client, version, champions)
        print(f"Seeded {count} champions into Redis")
        print("Done.")
    finally:
        await redis_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
