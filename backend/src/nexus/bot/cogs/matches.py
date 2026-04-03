"""Slash commands for match history with button pagination."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import discord
from discord import app_commands
from discord.ext import commands

from nexus.bot.embeds import match_detail_embed, match_history_embed

if TYPE_CHECKING:
    from nexus.bot.bot import NexusBot

logger = logging.getLogger(__name__)

MATCHES_PER_PAGE = 5


class MatchHistoryView(discord.ui.View):
    """Paginated match history with detail drill-down."""

    def __init__(
        self,
        bot: NexusBot,
        puuid: str,
        matches: list[dict[str, Any]],
        cursor: str | None,
        has_more: bool,
        author_id: int,
    ) -> None:
        super().__init__(timeout=120)
        self.bot = bot
        self.puuid = puuid
        self.matches = matches
        self.cursor = cursor
        self.has_more = has_more
        self.author_id = author_id
        self._prev_cursors: list[str | None] = []

    @discord.ui.button(label="Prev", style=discord.ButtonStyle.secondary)
    async def prev_button(
        self, interaction: discord.Interaction, _button: discord.ui.Button[MatchHistoryView]
    ) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message("Not your command.", ephemeral=True)
            return
        if not self._prev_cursors:
            await interaction.response.send_message("Already on the first page.", ephemeral=True)
            return
        prev_cursor = self._prev_cursors.pop()
        try:
            data = await self.bot.api.get_match_history(
                self.puuid, cursor=prev_cursor, limit=MATCHES_PER_PAGE
            )
            self.matches = data.get("data", [])
            pagination = data.get("pagination", {})
            self.cursor = pagination.get("cursor")
            self.has_more = pagination.get("has_more", False)
            embed = match_history_embed(self.matches)
            await interaction.response.edit_message(embed=embed, view=self)
        except Exception:
            logger.exception("Failed to paginate match history")
            await interaction.response.send_message("Failed to load page.", ephemeral=True)

    @discord.ui.button(label="Next", style=discord.ButtonStyle.secondary)
    async def next_button(
        self, interaction: discord.Interaction, _button: discord.ui.Button[MatchHistoryView]
    ) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message("Not your command.", ephemeral=True)
            return
        if not self.has_more:
            await interaction.response.send_message("No more matches.", ephemeral=True)
            return
        self._prev_cursors.append(self.cursor)
        try:
            data = await self.bot.api.get_match_history(
                self.puuid, cursor=self.cursor, limit=MATCHES_PER_PAGE
            )
            self.matches = data.get("data", [])
            pagination = data.get("pagination", {})
            self.cursor = pagination.get("cursor")
            self.has_more = pagination.get("has_more", False)
            embed = match_history_embed(self.matches)
            await interaction.response.edit_message(embed=embed, view=self)
        except Exception:
            logger.exception("Failed to paginate match history")
            await interaction.response.send_message("Failed to load page.", ephemeral=True)

    @discord.ui.button(label="Detail", style=discord.ButtonStyle.primary)
    async def detail_button(
        self, interaction: discord.Interaction, _button: discord.ui.Button[MatchHistoryView]
    ) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message("Not your command.", ephemeral=True)
            return
        if not self.matches:
            await interaction.response.send_message("No match to show detail for.", ephemeral=True)
            return
        match_id = self.matches[0].get("match_id", "")
        if not match_id:
            await interaction.response.send_message("Match ID missing.", ephemeral=True)
            return
        await interaction.response.defer()
        try:
            detail = await self.bot.api.get_match_detail(match_id)
            await interaction.followup.send(embed=match_detail_embed(detail))
        except Exception:
            logger.exception("Match detail fetch failed")
            await interaction.followup.send("Could not load match detail.", ephemeral=True)


class MatchesCog(commands.Cog):
    """Match history commands."""

    def __init__(self, bot: NexusBot) -> None:
        self.bot = bot

    @app_commands.command(name="history", description="Match history for a summoner")
    @app_commands.describe(
        region="Riot region",
        game_name="In-game name",
        tag_line="Tag line",
    )
    async def history(
        self,
        interaction: discord.Interaction,
        region: str,
        game_name: str,
        tag_line: str,
    ) -> None:
        await interaction.response.defer()
        try:
            summoner = await self.bot.api.lookup_summoner(region, game_name, tag_line)
            puuid = summoner["puuid"]
            data = await self.bot.api.get_match_history(puuid, limit=MATCHES_PER_PAGE)
            matches = data.get("data", [])
            pagination = data.get("pagination", {})
            cursor = pagination.get("cursor")
            has_more = pagination.get("has_more", False)
            author_id = interaction.user.id
            view = MatchHistoryView(self.bot, puuid, matches, cursor, has_more, author_id)
            embed = match_history_embed(matches)
            await interaction.followup.send(embed=embed, view=view)
        except Exception:
            logger.exception("Match history lookup failed")
            await interaction.followup.send(
                f"Could not fetch match history for **{game_name}#{tag_line}**.",
                ephemeral=True,
            )


async def setup(bot: NexusBot) -> None:
    await bot.add_cog(MatchesCog(bot))
