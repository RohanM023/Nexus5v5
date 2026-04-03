"""Shared Discord embed builders for Nexus bot commands."""

from __future__ import annotations

from typing import Any

import discord

NEXUS_COLOR = 0xD97706  # Gold / amber brand color
DDRAGON_BASE = "https://ddragon.leagueoflegends.com/cdn/14.10.1"

QUEUE_NAMES: dict[str, str] = {
    "RANKED_SOLO_5x5": "Solo/Duo",
    "RANKED_FLEX_SR": "Flex 5v5",
    "RANKED_TFT": "TFT",
}

TIER_EMOJIS: dict[str, str] = {
    "IRON": "<:iron:>",
    "BRONZE": "<:bronze:>",
    "SILVER": "<:silver:>",
    "GOLD": "<:gold:>",
    "PLATINUM": "<:plat:>",
    "EMERALD": "<:emerald:>",
    "DIAMOND": "<:diamond:>",
    "MASTER": "<:master:>",
    "GRANDMASTER": "<:gm:>",
    "CHALLENGER": "<:chall:>",
}


def summoner_embed(data: dict[str, Any]) -> discord.Embed:
    """Rich embed for a summoner profile lookup."""
    name = f"{data['game_name']}#{data['tag_line']}"
    icon_url = f"{DDRAGON_BASE}/img/profileicon/{data.get('profile_icon_id', 1)}.png"
    embed = discord.Embed(
        title=name,
        description=(
            f"Region: **{data['region'].upper()}** | Level: **{data.get('summoner_level', 0)}**"
        ),
        color=NEXUS_COLOR,
    )
    embed.set_thumbnail(url=icon_url)
    embed.set_footer(text="Nexus 5v5")
    return embed


def ranked_embed(data: dict[str, Any]) -> discord.Embed:
    """Embed for ranked queue entries."""
    embed = discord.Embed(title="Ranked Data", color=NEXUS_COLOR)
    entries = data.get("entries", [])
    if not entries:
        embed.description = "No ranked data found."
        return embed

    for entry in entries:
        queue = QUEUE_NAMES.get(entry.get("queue_type", ""), entry.get("queue_type", ""))
        tier = entry.get("tier", "UNRANKED")
        rank = entry.get("rank", "")
        lp = entry.get("league_points", 0)
        wins = entry.get("wins", 0)
        losses = entry.get("losses", 0)
        total = wins + losses
        wr = round(wins / total * 100, 1) if total else 0

        value = f"**{tier} {rank}** — {lp} LP\n{wins}W / {losses}L ({wr}% WR)"
        if entry.get("hot_streak"):
            value += " :fire:"
        embed.add_field(name=queue, value=value, inline=False)

    embed.set_footer(text="Nexus 5v5")
    return embed


def performance_embed(data: dict[str, Any]) -> discord.Embed:
    """Embed for aggregated performance stats."""
    total = data.get("total_games", 0)
    wr = data.get("overall_win_rate", 0)
    embed = discord.Embed(
        title="Performance Stats",
        description=f"**{total}** games — **{round(wr * 100, 1)}%** win rate",
        color=NEXUS_COLOR,
    )
    embed.add_field(
        name="KDA",
        value=(
            f"{data.get('avg_kills', 0):.1f} / "
            f"{data.get('avg_deaths', 0):.1f} / "
            f"{data.get('avg_assists', 0):.1f}  "
            f"(**{data.get('avg_kda', 0):.2f}**)"
        ),
        inline=False,
    )
    embed.add_field(name="CS/min", value=f"{data.get('avg_cs_per_min', 0):.1f}", inline=True)
    embed.add_field(name="Vision", value=f"{data.get('avg_vision_score', 0):.1f}", inline=True)

    top = data.get("top_champions", [])[:3]
    if top:
        lines = [
            f"**{c['champion_name']}** — {c['games_played']}G, {round(c['win_rate'] * 100)}% WR"
            for c in top
        ]
        embed.add_field(name="Top Champions", value="\n".join(lines), inline=False)

    embed.set_footer(text="Nexus 5v5")
    return embed


def champion_pool_embed(
    champions: list[dict[str, Any]], page: int, total_pages: int
) -> discord.Embed:
    """Paginated champion pool embed (5 per page)."""
    embed = discord.Embed(
        title="Champion Pool",
        description=f"Page {page}/{total_pages}",
        color=NEXUS_COLOR,
    )
    for c in champions:
        wr = round(c.get("win_rate", 0) * 100, 1)
        mastery = round(c.get("true_mastery", 0), 1)
        comfort = round(c.get("comfort_score", 0), 1)
        embed.add_field(
            name=f"{c['champion_name']} ({c.get('tier', '?')})",
            value=(
                f"{c.get('games_played', 0)}G — {wr}% WR\n"
                f"KDA: {c.get('avg_kda', 0):.2f} | Mastery: {mastery} | Comfort: {comfort}"
            ),
            inline=False,
        )
    embed.set_footer(text="Nexus 5v5")
    return embed


def match_history_embed(matches: list[dict[str, Any]]) -> discord.Embed:
    """Compact match list embed."""
    embed = discord.Embed(title="Match History", color=NEXUS_COLOR)
    if not matches:
        embed.description = "No matches found."
        return embed

    for m in matches:
        result = ":green_circle: Win" if m.get("win") else ":red_circle: Loss"
        kda = f"{m.get('kills', 0)}/{m.get('deaths', 0)}/{m.get('assists', 0)}"
        duration = m.get("game_duration", 0)
        minutes = duration // 60
        seconds = duration % 60
        embed.add_field(
            name=f"{m.get('champion_name', '?')} — {result}",
            value=f"KDA: **{kda}** | CS: {m.get('cs', 0)} | {minutes}:{seconds:02d}",
            inline=False,
        )
    embed.set_footer(text="Nexus 5v5")
    return embed


def match_detail_embed(data: dict[str, Any]) -> discord.Embed:
    """Full 10-player match breakdown embed."""
    duration = data.get("game_duration", 0)
    minutes = duration // 60
    seconds = duration % 60
    embed = discord.Embed(
        title=f"Match {data.get('match_id', '?')}",
        description=f"Duration: {minutes}:{seconds:02d}",
        color=NEXUS_COLOR,
    )

    for team_key, label in [("blue_team", "Blue Team"), ("red_team", "Red Team")]:
        team = data.get(team_key, {})
        result = "WIN" if team.get("win") else "LOSS"
        lines: list[str] = []
        for p in team.get("participants", []):
            kda = f"{p.get('kills', 0)}/{p.get('deaths', 0)}/{p.get('assists', 0)}"
            name = p.get("game_name") or p.get("champion_name", "?")
            lines.append(f"**{p.get('champion_name', '?')}** ({name}) — {kda}")
        embed.add_field(
            name=f"{label} ({result})",
            value="\n".join(lines) if lines else "No data",
            inline=False,
        )

    embed.set_footer(text="Nexus 5v5")
    return embed


def draft_board_embed(state: dict[str, Any]) -> discord.Embed:
    """Current draft picks/bans/scores board."""
    embed = discord.Embed(
        title="Draft Board",
        description=f"Phase: **{state.get('phase', 'ban_phase_1')}**",
        color=NEXUS_COLOR,
    )

    blue_picks = state.get("blue_picks", [])
    red_picks = state.get("red_picks", [])
    blue_bans = state.get("blue_bans", [])
    red_bans = state.get("red_bans", [])

    def _pick_lines(picks: list[dict[str, Any]]) -> str:
        if not picks:
            return "_none_"
        return "\n".join(
            f"{i + 1}. **{p.get('champion_name', '?')}** ({p.get('role') or '?'})"
            for i, p in enumerate(picks)
        )

    def _ban_lines(bans: list[str]) -> str:
        return ", ".join(bans) if bans else "_none_"

    embed.add_field(name="Blue Picks", value=_pick_lines(blue_picks), inline=True)
    embed.add_field(name="Red Picks", value=_pick_lines(red_picks), inline=True)
    embed.add_field(name="\u200b", value="\u200b", inline=True)  # spacer
    embed.add_field(name="Blue Bans", value=_ban_lines(blue_bans), inline=True)
    embed.add_field(name="Red Bans", value=_ban_lines(red_bans), inline=True)

    scores = state.get("scores")
    if scores:
        embed.add_field(
            name="Scores",
            value=(
                f"Synergy: **{scores.get('synergy_score', 0):.1f}** | "
                f"Counter: **{scores.get('counter_score', 0):.1f}** | "
                f"Total: **{scores.get('total_score', 0):.1f}**"
            ),
            inline=False,
        )

    suggestions = state.get("suggestions", [])[:5]
    if suggestions:
        lines = [
            f"**{s.get('champion_name', '?')}** — {s.get('composite_score', 0):.1f}"
            for s in suggestions
        ]
        embed.add_field(name="Top Suggestions", value="\n".join(lines), inline=False)

    embed.set_footer(text="Nexus 5v5")
    return embed


def scout_report_embed(players: list[dict[str, Any]]) -> discord.Embed:
    """Multi-player scouting summary."""
    embed = discord.Embed(title="Team Scout Report", color=NEXUS_COLOR)
    for p in players:
        perf = p.get("performance", {})
        top_champs = p.get("top_champions", [])[:3]
        champ_str = ", ".join(c.get("champion_name", "?") for c in top_champs) or "N/A"
        total = perf.get("total_games", 0)
        wr = perf.get("overall_win_rate", 0)
        kda = perf.get("avg_kda", 0)
        embed.add_field(
            name=p.get("name", "?"),
            value=(f"{total}G — {round(wr * 100, 1)}% WR — {kda:.2f} KDA\nTop: {champ_str}"),
            inline=False,
        )
    embed.set_footer(text="Nexus 5v5")
    return embed
