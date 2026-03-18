"""Base Riot API client with token bucket rate limiting, retries, and region routing."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any
from urllib.parse import quote

import httpx
from prometheus_client import Counter, Gauge

from nexus.config import get_settings
from nexus.shared.exceptions import RateLimitError, RiotAPIError
from nexus.shared.redis import cache_get, cache_set

logger = logging.getLogger(__name__)

RATE_LIMIT_HITS = Counter(
    "rate_limit_hits_total",
    "Total Riot API 429 rate-limit responses observed",
    ["region"],
)

RIOT_API_QUOTA = Gauge(
    "riot_api_quota_percentage",
    "Current Riot API quota usage percentage (0-100)",
    ["bucket"],
)

REGION_ROUTING: dict[str, str] = {
    "na1": "americas",
    "br1": "americas",
    "la1": "americas",
    "la2": "americas",
    "oc1": "sea",
    "ph2": "sea",
    "sg2": "sea",
    "th2": "sea",
    "tw2": "sea",
    "vn2": "sea",
    "euw1": "europe",
    "eun1": "europe",
    "tr1": "europe",
    "ru": "europe",
    "kr": "asia",
    "jp1": "asia",
}


def get_regional_host(region: str) -> str:
    routing = REGION_ROUTING.get(region.lower(), "americas")
    return f"https://{routing}.api.riotgames.com"


def get_platform_host(region: str) -> str:
    return f"https://{region.lower()}.api.riotgames.com"


class TokenBucket:
    """Simple token bucket rate limiter for Riot API."""

    def __init__(self, rate: int, period: float) -> None:
        self.rate = rate
        self.period = period
        self.tokens = float(rate)
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.rate, self.tokens + elapsed * (self.rate / self.period))
            self.last_refill = now

            if self.tokens < 1:
                wait_time = (1 - self.tokens) * (self.period / self.rate)
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

    @property
    def usage_ratio(self) -> float:
        """Return 0.0 (idle) to 1.0 (fully consumed)."""
        return max(0.0, 1.0 - (self.tokens / self.rate))


class RiotAPIClient:
    """Async Riot API client with rate limiting, retries, and caching."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.riot_api_key
        self._timeout = settings.riot_api_timeout
        self._max_retries = settings.riot_api_max_retries
        self._per_second = TokenBucket(settings.riot_api_rate_limit_per_second, 1.0)
        self._per_2min = TokenBucket(settings.riot_api_rate_limit_per_2min, 120.0)
        self._client: httpx.AsyncClient | None = None

    @property
    def per_second_bucket(self) -> TokenBucket:
        """Public access to the per-second rate limiter."""
        return self._per_second

    @property
    def per_2min_bucket(self) -> TokenBucket:
        """Public access to the per-2-minute rate limiter."""
        return self._per_2min

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self._timeout),
                headers={"X-Riot-Token": self._api_key},
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _check_quota_backoff(self) -> None:
        """Add linear delay when quota usage exceeds 80%."""
        ratio = self._per_2min.usage_ratio
        RIOT_API_QUOTA.labels(bucket="per_second").set(self._per_second.usage_ratio * 100)
        RIOT_API_QUOTA.labels(bucket="per_2min").set(ratio * 100)
        if ratio >= 0.8:
            delay = (ratio - 0.8) / 0.2 * 2.0  # 0-2s linear from 80-100%
            logger.warning("Riot API quota at %.0f%%, backing off %.1fs", ratio * 100, delay)
            await asyncio.sleep(delay)

    async def _request(
        self,
        method: str,
        url: str,
        *,
        cache_key: str | None = None,
        cache_ttl: int = 300,
    ) -> Any:
        await self._check_quota_backoff()

        if cache_key:
            cached = await cache_get(cache_key)
            if cached is not None:
                return cached

        await self._per_second.acquire()
        await self._per_2min.acquire()

        client = await self._get_client()
        last_error: Exception | None = None

        for attempt in range(self._max_retries):
            try:
                response = await client.request(method, url)

                if response.status_code == 429:
                    RATE_LIMIT_HITS.labels(region="unknown").inc()
                    retry_after = int(response.headers.get("Retry-After", "1"))
                    logger.warning(
                        "Riot API rate limited, retrying in %ds (attempt %d/%d)",
                        retry_after,
                        attempt + 1,
                        self._max_retries,
                    )
                    await asyncio.sleep(retry_after)
                    continue

                if response.status_code == 404:
                    return None

                if response.status_code >= 500:
                    wait = 2**attempt
                    logger.warning(
                        "Riot API server error %d, retrying in %ds (attempt %d/%d)",
                        response.status_code,
                        wait,
                        attempt + 1,
                        self._max_retries,
                    )
                    await asyncio.sleep(wait)
                    continue

                response.raise_for_status()
                data = response.json()

                if cache_key:
                    await cache_set(cache_key, data, cache_ttl)

                return data

            except httpx.HTTPStatusError as exc:
                last_error = exc
                if exc.response.status_code == 403:
                    raise RiotAPIError(
                        "Invalid or expired Riot API key",
                        status_code=403,
                    ) from exc
                raise RiotAPIError(
                    f"Riot API error: {exc.response.status_code}",
                    status_code=exc.response.status_code,
                ) from exc

            except httpx.TimeoutException as exc:
                last_error = exc
                wait = 2**attempt
                logger.warning(
                    "Riot API timeout, retrying in %ds (attempt %d/%d)",
                    wait,
                    attempt + 1,
                    self._max_retries,
                )
                await asyncio.sleep(wait)

        raise RateLimitError(
            f"Riot API request failed after {self._max_retries} retries"
        ) from last_error

    # --- Account-v1 ---

    async def get_account_by_riot_id(
        self, game_name: str, tag_line: str, region: str = "na1"
    ) -> dict[str, Any] | None:
        host = get_regional_host(region)
        encoded_name = quote(game_name, safe="")
        encoded_tag = quote(tag_line, safe="")
        url = f"{host}/riot/account/v1/accounts/by-riot-id/{encoded_name}/{encoded_tag}"
        return await self._request(
            "GET",
            url,
            cache_key=f"riot:account:{game_name}:{tag_line}",
            cache_ttl=900,
        )

    async def get_account_by_puuid(self, puuid: str, region: str = "na1") -> dict[str, Any] | None:
        host = get_regional_host(region)
        url = f"{host}/riot/account/v1/accounts/by-puuid/{puuid}"
        return await self._request(
            "GET",
            url,
            cache_key=f"riot:account:puuid:{puuid}",
            cache_ttl=900,
        )

    # --- Summoner-v4 ---

    async def get_summoner_by_puuid(
        self, puuid: str, region: str = "na1"
    ) -> dict[str, Any] | None:
        host = get_platform_host(region)
        url = f"{host}/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._request(
            "GET",
            url,
            cache_key=f"riot:summoner:{puuid}",
            cache_ttl=900,
        )

    # --- Match-v5 ---

    async def get_match_ids(
        self,
        puuid: str,
        region: str = "na1",
        *,
        queue: int | None = None,
        start: int = 0,
        count: int = 20,
    ) -> list[str]:
        host = get_regional_host(region)
        url = f"{host}/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = f"?start={start}&count={count}"
        if queue is not None:
            params += f"&queue={queue}"
        result = await self._request(
            "GET",
            url + params,
            cache_key=f"riot:matches:{puuid}:list:{queue}:{start}",
            cache_ttl=300,
        )
        return result if result else []

    async def get_match(self, match_id: str, region: str = "na1") -> dict[str, Any] | None:
        host = get_regional_host(region)
        url = f"{host}/lol/match/v5/matches/{match_id}"
        return await self._request(
            "GET",
            url,
            cache_key=f"riot:match:{match_id}",
            cache_ttl=86400,
        )

    async def get_match_timeline(
        self, match_id: str, region: str = "na1"
    ) -> dict[str, Any] | None:
        host = get_regional_host(region)
        url = f"{host}/lol/match/v5/matches/{match_id}/timeline"
        return await self._request(
            "GET",
            url,
            cache_key=f"riot:timeline:{match_id}",
            cache_ttl=86400,
        )

    # --- Champion-Mastery-v4 ---

    async def get_champion_masteries(
        self, puuid: str, region: str = "na1"
    ) -> list[dict[str, Any]]:
        host = get_platform_host(region)
        url = f"{host}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}"
        result = await self._request(
            "GET",
            url,
            cache_key=f"riot:mastery:{puuid}",
            cache_ttl=3600,
        )
        return result if result else []


_riot_client: RiotAPIClient | None = None


def get_riot_client() -> RiotAPIClient:
    global _riot_client
    if _riot_client is None:
        _riot_client = RiotAPIClient()
    return _riot_client


async def close_riot_client() -> None:
    global _riot_client
    if _riot_client is not None:
        await _riot_client.close()
        _riot_client = None
