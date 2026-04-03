"""Slash commands for in-Discord draft sessions."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import discord
from discord import app_commands
from discord.ext import commands

from nexus.bot.embeds import draft_board_embed

if TYPE_CHECKING:
    from nexus.bot.bot import NexusBot

logger = logging.getLogger(__name__)


def _new_draft_state() -> dict[str, Any]:
    return {
        "blue_picks": [],
        "red_picks": [],
        "blue_bans": [],
        "red_bans": [],
        "phase": "ban_phase_1",
        "scores": None,
        "suggestions": [],
    }


def _determine_phase(state: dict[str, Any]) -> str:
    blue_bans = len(state.get("blue_bans", []))
    red_bans = len(state.get("red_bans", []))
    blue_picks = len(state.get("blue_picks", []))
    red_picks = len(state.get("red_picks", []))
    total_bans = blue_bans + red_bans
    total_picks = blue_picks + red_picks
    if total_bans < 6:
        return "ban_phase_1"
    if total_picks < 6:
        return "pick_phase_1"
    if total_bans < 10:
        return "ban_phase_2"
    if total_picks < 10:
        return "pick_phase_2"
    return "completed"


class DraftCog(commands.Cog):
    """Manage draft sessions in Discord threads."""

    def __init__(self, bot: NexusBot) -> None:
        self.bot = bot
        self._sessions: dict[int, dict[str, Any]] = {}

    draft_group = app_commands.Group(name="draft", description="Draft session commands")

    @draft_group.command(name="start", description="Start a new draft session in a thread")
    async def draft_start(self, interaction: discord.Interaction) -> None:
        if not isinstance(interaction.channel, discord.TextChannel):
            await interaction.response.send_message("Use this in a text channel.", ephemeral=True)
            return

        await interaction.response.defer()
        thread = await interaction.channel.create_thread(
            name=f"Draft — {interaction.user.display_name}",
            auto_archive_duration=60,
            type=discord.ChannelType.public_thread,
        )
        state = _new_draft_state()
        self._sessions[thread.id] = state
        embed = draft_board_embed(state)
        await thread.send(embed=embed)
        await interaction.followup.send(f"Draft started! Head to {thread.mention} to pick/ban.")

    @draft_group.command(name="pick", description="Register a champion pick")
    @app_commands.describe(
        champion="Champion name",
        side="blue or red",
        role="Role (top/jg/mid/bot/sup)",
    )
    @app_commands.choices(
        side=[
            app_commands.Choice(name="Blue", value="blue"),
            app_commands.Choice(name="Red", value="red"),
        ]
    )
    async def draft_pick(
        self,
        interaction: discord.Interaction,
        champion: str,
        side: app_commands.Choice[str],
        role: str | None = None,
    ) -> None:
        thread_id = interaction.channel_id
        if thread_id is None or thread_id not in self._sessions:
            await interaction.response.send_message(
                "No active draft in this thread. Use `/draft start` first.",
                ephemeral=True,
            )
            return

        state = self._sessions[thread_id]
        side_key = f"{side.value}_picks"
        picks: list[dict[str, Any]] = state.get(side_key, [])

        if len(picks) >= 5:
            await interaction.response.send_message(
                f"{side.name} side already has 5 picks.", ephemeral=True
            )
            return

        picks.append({"champion_name": champion, "role": role or "fill"})
        state[side_key] = picks
        state["phase"] = _determine_phase(state)

        await interaction.response.defer()

        # Call the stateless analyze endpoint for updated scores
        try:
            ally = [
                {"champion_id": 0, "champion_name": p["champion_name"], "role": p.get("role", "")}
                for p in state.get("blue_picks", [])
            ]
            opponent = [
                {"champion_id": 0, "champion_name": p["champion_name"], "role": p.get("role", "")}
                for p in state.get("red_picks", [])
            ]
            result = await self.bot.api.analyze_draft(ally, opponent)
            state["scores"] = {
                "synergy_score": result.get("synergy_score", 0),
                "counter_score": result.get("counter_score", 0),
                "total_score": result.get("total_score", 0),
            }
            state["suggestions"] = result.get("suggestions", [])
        except Exception:
            logger.warning("Draft analysis call failed, showing board without scores")

        embed = draft_board_embed(state)
        await interaction.followup.send(embed=embed)

    @draft_group.command(name="ban", description="Register a champion ban")
    @app_commands.describe(champion="Champion name", side="blue or red")
    @app_commands.choices(
        side=[
            app_commands.Choice(name="Blue", value="blue"),
            app_commands.Choice(name="Red", value="red"),
        ]
    )
    async def draft_ban(
        self,
        interaction: discord.Interaction,
        champion: str,
        side: app_commands.Choice[str],
    ) -> None:
        thread_id = interaction.channel_id
        if thread_id is None or thread_id not in self._sessions:
            await interaction.response.send_message(
                "No active draft in this thread.", ephemeral=True
            )
            return

        state = self._sessions[thread_id]
        side_key = f"{side.value}_bans"
        bans: list[str] = state.get(side_key, [])

        if len(bans) >= 5:
            await interaction.response.send_message(
                f"{side.name} side already has 5 bans.", ephemeral=True
            )
            return

        bans.append(champion)
        state[side_key] = bans
        state["phase"] = _determine_phase(state)

        embed = draft_board_embed(state)
        await interaction.response.send_message(embed=embed)

    @draft_group.command(name="end", description="End the current draft session")
    async def draft_end(self, interaction: discord.Interaction) -> None:
        thread_id = interaction.channel_id
        if thread_id is None or thread_id not in self._sessions:
            await interaction.response.send_message(
                "No active draft in this thread.", ephemeral=True
            )
            return

        del self._sessions[thread_id]
        await interaction.response.send_message("Draft session ended.")


async def setup(bot: NexusBot) -> None:
    await bot.add_cog(DraftCog(bot))
