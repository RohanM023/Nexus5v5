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
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-md bg-[var(--color-surface)]"
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
        Pick or ban a champion to see recommendations.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {suggestions.slice(0, 4).map((s, idx) => (
        <div
          key={s.champion_id}
          className="flex items-center gap-2.5 rounded-md bg-[var(--color-surface)] p-3 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <span className="font-mono text-sm font-bold text-[var(--color-accent-text)]/60">{idx + 1}</span>
          <Image
            src={getChampionIconUrl(s.champion_name)}
            alt={s.champion_name}
            width={32}
            height={32}
            className="rounded"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
              {s.champion_name}
            </p>
            <p className="font-mono text-[10px] text-[var(--color-text-muted)]">
              Syn <span className="text-[var(--color-accent-text)]">+{s.synergy_contribution.toFixed(1)}</span>{" "}
              Ctr <span className="text-[var(--color-accent-text)]">+{s.counter_contribution.toFixed(1)}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
