"""Entry point for the Nexus Discord bot: ``python -m nexus.bot``."""

from __future__ import annotations

import asyncio
import logging
import sys

from nexus.bot.bot import NexusBot
from nexus.config import get_settings


def main() -> None:
    settings = get_settings()

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    token = settings.discord_bot_token
    if not token:
        logging.error("DISCORD_BOT_TOKEN is not set — cannot start bot")
        sys.exit(1)

    bot = NexusBot(
        api_base_url=settings.nexus_api_base_url,
        application_id=int(settings.discord_application_id)
        if settings.discord_application_id
        else None,
    )
    asyncio.run(bot.start(token))


if __name__ == "__main__":
    main()
