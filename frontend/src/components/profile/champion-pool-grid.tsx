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
import type { ChampionPoolEntry } from "@/types";

interface ChampionPoolGridProps {
  champions: ChampionPoolEntry[];
}

type FilterRole = "ALL" | "TOP" | "JUNGLE" | "MID" | "BOT" | "SUPPORT";
type SortBy = "mastery" | "comfort" | "winrate" | "games";

export function ChampionPoolGrid({ champions }: ChampionPoolGridProps) {
  const [filterRole, setFilterRole] = useState<FilterRole>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("mastery");

  const filtered =
    filterRole === "ALL"
      ? champions
      : champions.filter((c) =>
          c.roles.some((r) => r.toUpperCase() === filterRole)
        );

  const sorted = [...filtered].sort((a, b) => {
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

  const roles: FilterRole[] = ["ALL", "TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];
  const sortOptions: { value: SortBy; label: string }[] = [
    { value: "mastery", label: "True Mastery" },
    { value: "comfort", label: "Comfort" },
    { value: "winrate", label: "Win Rate" },
    { value: "games", label: "Games" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Champion Pool</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-slate-700 p-0.5">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    filterRole === role
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {role === "ALL" ? "All" : role.charAt(0) + role.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No champions found for this filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((champ) => (
              <ChampionCard key={champ.champion_id} champion={champ} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChampionCardProps {
  champion: ChampionPoolEntry;
}

function ChampionCard({ champion }: ChampionCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 p-3 transition-colors hover:border-slate-700">
      <div className="relative flex-shrink-0">
        <Image
          src={getChampionIconUrl(champion.champion_name)}
          alt={champion.champion_name}
          width={48}
          height={48}
          className="rounded-lg"
          unoptimized
        />
        <div
          className={cn(
            "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold",
            getTierBgColor(champion.tier),
            getTierColor(champion.tier)
          )}
        >
          {champion.tier}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-white">
            {champion.champion_name}
          </p>
          <span className="text-xs text-slate-500">
            {champion.games_played} games
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
          <span
            className={cn(
              champion.win_rate >= 0.5 ? "text-green-400" : "text-red-400"
            )}
          >
            {formatWinRate(champion.win_rate)} WR
          </span>
          <span>{champion.avg_kda.toFixed(1)} KDA</span>
        </div>

        <div className="mt-2 space-y-1.5">
          <ScoreBar
            label="Mastery"
            value={champion.true_mastery}
            maxValue={100}
          />
          <ScoreBar
            label="Comfort"
            value={champion.comfort_score}
            maxValue={100}
          />
        </div>
      </div>
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  value: number;
  maxValue: number;
}

function ScoreBar({ label, value, maxValue }: ScoreBarProps) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[10px] text-slate-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className={cn("h-full rounded-full transition-all", getScoreBarColor(value))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-6 text-right text-[10px] font-medium text-slate-400">
        {Math.round(value)}
      </span>
    </div>
  );
}
