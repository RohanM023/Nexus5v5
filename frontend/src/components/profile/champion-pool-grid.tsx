"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cn,
  formatWinRate,
  getChampionIconUrl,
  getScoreBarColor,
  getTierBgColor,
  getTierColor,
} from "@/lib/utils";
import { WinLossSparkline } from "@/components/charts/win-loss-sparkline";
import type { ChampionPoolEntry } from "@/types";

interface ChampionPoolGridProps {
  champions: ChampionPoolEntry[];
  variant?: "grid" | "compact";
  trendsMap?: Map<number, boolean[]>;
}

type SortBy = "mastery" | "comfort" | "winrate" | "games";

export function ChampionPoolGrid({ champions, variant = "grid", trendsMap }: ChampionPoolGridProps) {
  const [sortBy, setSortBy] = useState<SortBy>("mastery");

  const sorted = [...champions].sort((a, b) => {
    switch (sortBy) {
      case "mastery":
        return b.true_mastery - a.true_mastery;
      case "comfort":
        return b.comfort_score - a.comfort_score;
      case "winrate":
        return b.win_rate - a.win_rate;
      case "games":
        return b.games_played - a.games_played;
      default:
        return 0;
    }
  });

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: "mastery", label: "Mastery" },
    { value: "comfort", label: "Comfort" },
    { value: "winrate", label: "Win Rate" },
    { value: "games", label: "Games" },
  ];

  if (variant === "compact") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Most Played</CardTitle>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="border-b border-[var(--color-border)] bg-transparent py-0.5 font-mono text-[9px] text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {sorted.slice(0, 10).map((champ) => (
            <CompactChampionRow key={champ.champion_id} champion={champ} sparkline={trendsMap?.get(champ.champion_id)} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Champion Pool</CardTitle>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="border-b border-[var(--color-border)] bg-transparent py-1 font-mono text-[10px] text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            No champions found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((champ) => (
              <ChampionCard key={champ.champion_id} champion={champ} sparkline={trendsMap?.get(champ.champion_id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompactChampionRow({ champion, sparkline }: { champion: ChampionPoolEntry; sparkline?: boolean[] }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-2 transition-colors hover:bg-[var(--color-surface-hover)]">
      <div className="relative shrink-0">
        <Image
          src={getChampionIconUrl(champion.champion_name)}
          alt={champion.champion_name}
          width={28}
          height={28}
          className="rounded-sm"
          unoptimized
        />
        <div
          className={cn(
            "absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[7px] font-bold",
            getTierBgColor(champion.tier),
            getTierColor(champion.tier)
          )}
        >
          {champion.tier}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
          {champion.champion_name}
        </p>
        {sparkline && sparkline.length > 0 && (
          <div className="mt-0.5">
            <WinLossSparkline results={sparkline} />
          </div>
        )}
      </div>
      <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
        {champion.games_played}g
      </span>
      <span
        className={cn(
          "w-10 text-right font-mono text-[10px] font-medium",
          champion.win_rate >= 0.5 ? "text-[var(--color-score-high)]" : "text-[var(--color-score-poor)]"
        )}
      >
        {formatWinRate(champion.win_rate)}
      </span>
    </div>
  );
}

function ChampionCard({ champion, sparkline }: { champion: ChampionPoolEntry; sparkline?: boolean[] }) {
  return (
    <div className="flex items-start gap-3 rounded-sm bg-[var(--background)] p-3 transition-colors hover:bg-[var(--color-surface-hover)]">
      <div className="relative shrink-0">
        <Image
          src={getChampionIconUrl(champion.champion_name)}
          alt={champion.champion_name}
          width={36}
          height={36}
          className="rounded-sm"
          unoptimized
        />
        <div
          className={cn(
            "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-sm text-[8px] font-bold",
            getTierBgColor(champion.tier),
            getTierColor(champion.tier)
          )}
        >
          {champion.tier}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
            {champion.champion_name}
          </p>
          <span className="font-mono text-[9px] text-[var(--color-text-muted)]">
            {champion.games_played}g
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-3 font-mono text-[9px]">
          <span
            className={cn(
              champion.win_rate >= 0.5 ? "text-[var(--color-score-high)]" : "text-[var(--color-score-poor)]"
            )}
          >
            {formatWinRate(champion.win_rate)}
          </span>
          <span className="text-[var(--color-text-muted)]">{champion.avg_kda.toFixed(1)} KDA</span>
        </div>

        {sparkline && sparkline.length > 0 && (
          <div className="mt-1">
            <WinLossSparkline results={sparkline} />
          </div>
        )}

        <div className="mt-1.5 space-y-1">
          <ScoreBar label="Mst" value={champion.true_mastery} maxValue={100} />
          <ScoreBar label="Cmf" value={champion.comfort_score} maxValue={100} />
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, maxValue }: { label: string; value: number; maxValue: number }) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 font-mono text-[8px] tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <div className="h-px flex-1 overflow-hidden bg-[var(--color-border)]">
        <div
          className={cn("h-full transition-all", getScoreBarColor(value))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-5 text-right font-mono text-[8px] text-[var(--color-text-muted)]">
        {Math.round(value)}
      </span>
    </div>
  );
}
