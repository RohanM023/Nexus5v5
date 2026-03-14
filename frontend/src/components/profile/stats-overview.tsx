"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatWinRate } from "@/lib/utils";
import type { PerformanceStats } from "@/types";

interface StatsOverviewProps {
  stats: PerformanceStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const statCards = [
    {
      label: "Win Rate",
      value: formatWinRate(stats.overall_win_rate),
      color: stats.overall_win_rate >= 0.5 ? "text-green-400" : "text-red-400",
      subtext: `${stats.total_games} games`,
    },
    {
      label: "Avg KDA",
      value: stats.avg_kda.toFixed(2),
      color:
        stats.avg_kda >= 3
          ? "text-green-400"
          : stats.avg_kda >= 2
            ? "text-blue-400"
            : "text-yellow-400",
      subtext: "K+A / D",
    },
    {
      label: "CS/min",
      value: stats.avg_cs_per_min.toFixed(1),
      color:
        stats.avg_cs_per_min >= 8
          ? "text-green-400"
          : stats.avg_cs_per_min >= 6
            ? "text-blue-400"
            : "text-yellow-400",
      subtext: "avg",
    },
    {
      label: "Vision Score",
      value: stats.avg_vision_score.toFixed(0),
      color: stats.avg_vision_score >= 30 ? "text-green-400" : "text-blue-400",
      subtext: "per game",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
            <p className={cn("mt-1 text-2xl font-bold", stat.color)}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{stat.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
