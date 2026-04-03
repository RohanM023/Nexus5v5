"""Nexus Discord bot — subclass of commands.Bot."""

from __future__ import annotations

import logging

import discord
from discord.ext import commands

from nexus.bot.api_client import NexusAPIClient

logger = logging.getLogger(__name__)

INITIAL_EXTENSIONS = [
    "nexus.bot.cogs.lookup",
    "nexus.bot.cogs.stats",
    "nexus.bot.cogs.matches",
    "nexus.bot.cogs.draft",
    "nexus.bot.cogs.scout",
]


class NexusBot(commands.Bot):
    """Main bot class with the Nexus API client attached."""

    api: NexusAPIClient

    def __init__(self, api_base_url: str, **kwargs: object) -> None:
        intents = discord.Intents.default()
        super().__init__(command_prefix="!", intents=intents, **kwargs)
        self.api = NexusAPIClient(api_base_url)

    async def setup_hook(self) -> None:
        for ext in INITIAL_EXTENSIONS:
            await self.load_extension(ext)
            logger.info("Loaded extension %s", ext)
        await self.tree.sync()
        logger.info("Slash commands synced")

    async def close(self) -> None:
        await self.api.close()
        await super().close()

    async def on_ready(self) -> None:
        uid = self.user.id if self.user else "?"
        logger.info("Nexus bot ready as %s (ID: %s)", self.user, uid)
