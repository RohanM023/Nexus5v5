"use client";

import Image from "next/image";
import { getChampionIconUrl } from "@/lib/utils";
import type { ChampionSuggestion } from "@/types";

interface RecommendationRowProps {
  suggestions: ChampionSuggestion[];
  loading: boolean;
}

export function RecommendationRow({ suggestions, loading }: RecommendationRowProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-slate-800 bg-slate-800/30"
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        Pick or ban a champion to see recommendations.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {suggestions.slice(0, 4).map((s, idx) => (
        <div
          key={s.champion_id}
          className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/40 p-3 transition-colors hover:border-teal-500/40"
        >
          <span className="text-lg font-bold text-teal-400">{idx + 1}</span>
          <Image
            src={getChampionIconUrl(s.champion_name)}
            alt={s.champion_name}
            width={40}
            height={40}
            className="rounded-lg"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">
              {s.champion_name}
            </p>
            <p className="text-[10px] text-slate-400">
              Team Synergy:{" "}
              <span className="font-semibold text-teal-400">
                +{s.synergy_contribution.toFixed(1)}%
              </span>
            </p>
            <p className="text-[10px] text-slate-400">
              Opponent Counter:{" "}
              <span className="font-semibold text-blue-400">
                +{s.counter_contribution.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
