"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatWinRate } from "@/lib/utils";
import type { PerformanceStats } from "@/types";

interface StatsOverviewProps {
  stats: PerformanceStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const statItems = [
    {
      label: "Games",
      value: stats.total_games.toString(),
      color: "text-[var(--color-text-primary)]",
      subtext: `${stats.total_wins}W ${stats.total_losses}L`,
    },
    {
      label: "Win Rate",
      value: formatWinRate(stats.overall_win_rate),
      color: stats.overall_win_rate >= 0.5 ? "text-[var(--color-score-high)]" : "text-[var(--color-score-poor)]",
      subtext: "",
    },
    {
      label: "KDA",
      value: stats.avg_kda.toFixed(2),
      color:
        stats.avg_kda >= 3
          ? "text-[var(--color-score-high)]"
          : stats.avg_kda >= 2
            ? "text-[var(--color-score-mid)]"
            : "text-[var(--color-score-low)]",
      subtext: `${stats.avg_kills.toFixed(1)} / ${stats.avg_deaths.toFixed(1)} / ${stats.avg_assists.toFixed(1)}`,
    },
    {
      label: "CS/Min",
      value: stats.avg_cs_per_min.toFixed(1),
      color:
        stats.avg_cs_per_min >= 8
          ? "text-[var(--color-score-high)]"
          : stats.avg_cs_per_min >= 6
            ? "text-[var(--color-score-mid)]"
            : "text-[var(--color-score-low)]",
      subtext: "",
    },
    {
      label: "Vision",
      value: stats.avg_vision_score.toFixed(0),
      color: stats.avg_vision_score >= 30 ? "text-[var(--color-score-high)]" : "text-[var(--color-score-mid)]",
      subtext: "per game",
    },
  ];

  return (
    <Card>
      <CardContent className="py-4">
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
        {/* Mobile: 2x2 + 1 grid */}
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
