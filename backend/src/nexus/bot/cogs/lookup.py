"""Slash commands for summoner profile and ranked lookups."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

from nexus.bot.embeds import ranked_embed, summoner_embed

if TYPE_CHECKING:
    from nexus.bot.bot import NexusBot

logger = logging.getLogger(__name__)


class LookupCog(commands.Cog):
    """Summoner lookup and ranked data commands."""

    def __init__(self, bot: NexusBot) -> None:
        self.bot = bot

    @app_commands.command(name="lookup", description="Look up a summoner profile")
    @app_commands.describe(
        region="Riot region (na1, euw1, kr, etc.)",
        game_name="In-game name",
        tag_line="Tag line (e.g. NA1)",
    )
    async def lookup(
        self,
        interaction: discord.Interaction,
        region: str,
        game_name: str,
        tag_line: str,
    ) -> None:
        await interaction.response.defer()
        try:
            summoner = await self.bot.api.lookup_summoner(region, game_name, tag_line)
            ranked = await self.bot.api.get_ranked(region, game_name, tag_line)
            embed_s = summoner_embed(summoner)
            embed_r = ranked_embed(ranked)
            await interaction.followup.send(embeds=[embed_s, embed_r])
        except Exception:
            logger.exception("Lookup failed for %s#%s", game_name, tag_line)
            await interaction.followup.send(
                f"Could not find summoner **{game_name}#{tag_line}** in **{region}**.",
                ephemeral=True,
            )

    @app_commands.command(name="ranked", description="Get ranked stats for a summoner")
    @app_commands.describe(
        region="Riot region",
        game_name="In-game name",
        tag_line="Tag line",
    )
    async def ranked(
        self,
        interaction: discord.Interaction,
        region: str,
        game_name: str,
        tag_line: str,
    ) -> None:
        await interaction.response.defer()
        try:
            data = await self.bot.api.get_ranked(region, game_name, tag_line)
            await interaction.followup.send(embed=ranked_embed(data))
        except Exception:
            logger.exception("Ranked lookup failed for %s#%s", game_name, tag_line)
            await interaction.followup.send(
                f"Could not fetch ranked data for **{game_name}#{tag_line}**.",
                ephemeral=True,
            )


async def setup(bot: NexusBot) -> None:
    await bot.add_cog(LookupCog(bot))
