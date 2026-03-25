"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatWinRate, formatKDARatio } from "@/lib/utils";
import type { MatchSummary } from "@/types";

interface RecentStatsBarProps {
  matches: MatchSummary[];
}

export function RecentStatsBar({ matches }: RecentStatsBarProps) {
  if (matches.length === 0) return null;

  const total = matches.length;
  const wins = matches.filter((m) => m.win).length;
  const losses = total - wins;
  const winRate = total > 0 ? wins / total : 0;

  const avgKills = matches.reduce((s, m) => s + m.kills, 0) / total;
  const avgDeaths = matches.reduce((s, m) => s + m.deaths, 0) / total;
  const avgAssists = matches.reduce((s, m) => s + m.assists, 0) / total;

  const avgCsPerMin =
    matches.reduce((s, m) => {
      const mins = m.game_duration / 60;
      return s + (mins > 0 ? m.cs / mins : 0);
    }, 0) / total;

  const avgDamage = matches.reduce((s, m) => s + m.damage_dealt, 0) / total;

  const statItems = [
    {
      label: "Games",
      value: total.toString(),
      color: "text-[var(--color-text-primary)]",
      subtext: `${wins}W ${losses}L`,
    },
    {
      label: "Win Rate",
      value: formatWinRate(winRate),
      color: winRate >= 0.5 ? "text-[var(--color-score-high)]" : "text-[var(--color-score-poor)]",
      subtext: "",
    },
    {
      label: "KDA",
      value: formatKDARatio(avgKills, avgDeaths, avgAssists),
      color:
        avgDeaths === 0
          ? "text-[var(--color-score-high)]"
          : (avgKills + avgAssists) / avgDeaths >= 3
            ? "text-[var(--color-score-high)]"
            : (avgKills + avgAssists) / avgDeaths >= 2
              ? "text-[var(--color-score-mid)]"
              : "text-[var(--color-score-low)]",
      subtext: `${avgKills.toFixed(1)} / ${avgDeaths.toFixed(1)} / ${avgAssists.toFixed(1)}`,
    },
    {
      label: "CS/Min",
      value: avgCsPerMin.toFixed(1),
      color:
        avgCsPerMin >= 8
          ? "text-[var(--color-score-high)]"
          : avgCsPerMin >= 6
            ? "text-[var(--color-score-mid)]"
            : "text-[var(--color-score-low)]",
      subtext: "",
    },
    {
      label: "Damage",
      value: `${(avgDamage / 1000).toFixed(1)}k`,
      color: "text-[var(--color-text-primary)]",
      subtext: "avg/game",
    },
  ];

  return (
    <Card>
      <CardContent className="py-3">
        <p className="mb-2 font-mono text-[8px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
          Recent {total} Games
        </p>
        {/* Desktop: horizontal bar */}
        <div className="hidden items-center sm:flex">
          {statItems.map((stat, idx) => (
            <div
              key={stat.label}
              className={cn(
                "flex-1 px-4 text-center",
                idx > 0 && "border-l border-[var(--color-border)]"
              )}
            >
              <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
                {stat.label}
              </p>
              <p className={cn("mt-0.5 font-mono text-xl font-bold tracking-tight", stat.color)}>
                {stat.value}
              </p>
              {stat.subtext && (
                <p className="mt-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                  {stat.subtext}
                </p>
              )}
            </div>
          ))}
        </div>
        {/* Mobile: 2-column grid */}
        <div className="grid grid-cols-2 gap-4 sm:hidden">
          {statItems.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
                {stat.label}
              </p>
              <p className={cn("mt-0.5 font-mono text-lg font-bold tracking-tight", stat.color)}>
                {stat.value}
              </p>
              {stat.subtext && (
                <p className="mt-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                  {stat.subtext}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
