"""Slash command for team scouting reports."""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Any

import discord
from discord import app_commands
from discord.ext import commands

from nexus.bot.embeds import scout_report_embed

if TYPE_CHECKING:
    from nexus.bot.bot import NexusBot

logger = logging.getLogger(__name__)


class ScoutCog(commands.Cog):
    """Team scouting report command."""

    def __init__(self, bot: NexusBot) -> None:
        self.bot = bot

    @app_commands.command(
        name="scout",
        description="Scout a team (up to 5 players: region:GameName#Tag)",
    )
    @app_commands.describe(
        player1="Player 1 — region:GameName#Tag",
        player2="Player 2 — region:GameName#Tag",
        player3="Player 3 (optional)",
        player4="Player 4 (optional)",
        player5="Player 5 (optional)",
    )
    async def scout(
        self,
        interaction: discord.Interaction,
        player1: str,
        player2: str,
        player3: str | None = None,
        player4: str | None = None,
        player5: str | None = None,
    ) -> None:
        await interaction.response.defer()
        raw = [p for p in [player1, player2, player3, player4, player5] if p]

        parsed: list[tuple[str, str, str]] = []
        for entry in raw:
            try:
                region, rest = entry.split(":", 1)
                game_name, tag = rest.rsplit("#", 1)
                parsed.append((region.strip(), game_name.strip(), tag.strip()))
            except ValueError:
                await interaction.followup.send(
                    f"Invalid format: `{entry}`. Use `region:GameName#Tag`.",
                    ephemeral=True,
                )
                return

        async def _fetch_player(region: str, game_name: str, tag_line: str) -> dict[str, Any]:
            summoner = await self.bot.api.lookup_summoner(region, game_name, tag_line)
            puuid = summoner["puuid"]
            perf = await self.bot.api.get_performance(puuid)
            pool = await self.bot.api.get_champion_pool(puuid)
            return {
                "name": f"{game_name}#{tag_line}",
                "performance": perf,
                "top_champions": pool.get("champions", [])[:3],
            }

        try:
            results = await asyncio.gather(*[_fetch_player(r, g, t) for r, g, t in parsed])
            embed = scout_report_embed(list(results))
            await interaction.followup.send(embed=embed)
        except Exception:
            logger.exception("Scout report failed")
            await interaction.followup.send(
                "Failed to generate scout report. Check player names and try again.",
                ephemeral=True,
            )


async def setup(bot: NexusBot) -> None:
    await bot.add_cog(ScoutCog(bot))
