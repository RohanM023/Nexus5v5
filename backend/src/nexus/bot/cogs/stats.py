"""Slash commands for performance stats and champion pool."""

from __future__ import annotations

import logging
import math
from typing import TYPE_CHECKING, Any

import discord
from discord import app_commands
from discord.ext import commands

from nexus.bot.embeds import champion_pool_embed, performance_embed

if TYPE_CHECKING:
    from nexus.bot.bot import NexusBot

logger = logging.getLogger(__name__)

CHAMPS_PER_PAGE = 5


class ChampionPoolView(discord.ui.View):
    """Paginated view for champion pool data."""

    def __init__(self, champions: list[dict[str, Any]], author_id: int) -> None:
        super().__init__(timeout=120)
        self.champions = champions
        self.author_id = author_id
        self.page = 1
        self.total_pages = max(1, math.ceil(len(champions) / CHAMPS_PER_PAGE))

    def _current_page(self) -> list[dict[str, Any]]:
        start = (self.page - 1) * CHAMPS_PER_PAGE
        return self.champions[start : start + CHAMPS_PER_PAGE]

    @discord.ui.button(label="Prev", style=discord.ButtonStyle.secondary)
    async def prev_button(
        self, interaction: discord.Interaction, _button: discord.ui.Button[ChampionPoolView]
    ) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message("Not your command.", ephemeral=True)
            return
        self.page = max(1, self.page - 1)
        embed = champion_pool_embed(self._current_page(), self.page, self.total_pages)
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="Next", style=discord.ButtonStyle.secondary)
    async def next_button(
        self, interaction: discord.Interaction, _button: discord.ui.Button[ChampionPoolView]
    ) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message("Not your command.", ephemeral=True)
            return
        self.page = min(self.total_pages, self.page + 1)
        embed = champion_pool_embed(self._current_page(), self.page, self.total_pages)
        await interaction.response.edit_message(embed=embed, view=self)


class StatsCog(commands.Cog):
    """Performance and champion pool commands."""

    def __init__(self, bot: NexusBot) -> None:
        self.bot = bot

    @app_commands.command(name="stats", description="Performance stats for a summoner")
    @app_commands.describe(
        region="Riot region",
        game_name="In-game name",
        tag_line="Tag line",
    )
    async def stats(
        self,
        interaction: discord.Interaction,
        region: str,
        game_name: str,
        tag_line: str,
    ) -> None:
        await interaction.response.defer()
        try:
            summoner = await self.bot.api.lookup_summoner(region, game_name, tag_line)
            perf = await self.bot.api.get_performance(summoner["puuid"])
            await interaction.followup.send(embed=performance_embed(perf))
        except Exception:
            logger.exception("Stats lookup failed")
            await interaction.followup.send(
                f"Could not fetch stats for **{game_name}#{tag_line}**.",
                ephemeral=True,
            )

    @app_commands.command(name="champions", description="Champion pool for a summoner")
    @app_commands.describe(
        region="Riot region",
        game_name="In-game name",
        tag_line="Tag line",
    )
    async def champions(
        self,
        interaction: discord.Interaction,
        region: str,
        game_name: str,
        tag_line: str,
    ) -> None:
        await interaction.response.defer()
        try:
            summoner = await self.bot.api.lookup_summoner(region, game_name, tag_line)
            pool = await self.bot.api.get_champion_pool(summoner["puuid"])
            champs = pool.get("champions", [])
            if not champs:
                await interaction.followup.send("No champion data found.", ephemeral=True)
                return
            view = ChampionPoolView(champs, interaction.user.id)
            embed = champion_pool_embed(champs[:CHAMPS_PER_PAGE], 1, view.total_pages)
            await interaction.followup.send(embed=embed, view=view)
        except Exception:
            logger.exception("Champion pool lookup failed")
            await interaction.followup.send(
                f"Could not fetch champion pool for **{game_name}#{tag_line}**.",
                ephemeral=True,
            )


async def setup(bot: NexusBot) -> None:
    await bot.add_cog(StatsCog(bot))
