"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import { cn, getChampionIconUrl, getScoreBarColor, getScoreColor } from "@/lib/utils";
import type { ChampionSuggestion } from "@/types";

interface SuggestionPanelProps {
  suggestions: ChampionSuggestion[];
  loading: boolean;
}

export function SuggestionPanel({ suggestions, loading }: SuggestionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Picks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">
            Pick or ban to see suggestions.
          </p>
        ) : (
          <div className="space-y-1">
            {suggestions.slice(0, 10).map((suggestion, idx) => (
              <SuggestionRow
                key={suggestion.champion_id}
                suggestion={suggestion}
                rank={idx + 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionRow({
  suggestion,
  rank,
}: {
  suggestion: ChampionSuggestion;
  rank: number;
}) {
  return (
    <div className="rounded px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-hover)]">
      <div className="flex items-center gap-2.5">
        <span className="w-4 font-mono text-[10px] text-[var(--color-text-muted)]">
          {rank}
        </span>
        <Image
          src={getChampionIconUrl(suggestion.champion_name)}
          alt={suggestion.champion_name}
          width={28}
          height={28}
          className="rounded-sm"
          unoptimized
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">
              {suggestion.champion_name}
            </span>
            <span
              className={cn(
                "font-mono text-xs font-bold",
                getScoreColor(suggestion.composite_score)
              )}
            >
              {suggestion.composite_score.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-1.5 space-y-0.5 pl-[26px]">
        <ScoreBreakdownBar label="Syn" value={suggestion.synergy_contribution} />
        <ScoreBreakdownBar label="Ctr" value={suggestion.counter_contribution} />
        <ScoreBreakdownBar label="Cmf" value={suggestion.comfort_contribution} />
      </div>
    </div>
  );
}

function ScoreBreakdownBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 font-mono text-[8px] tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <div className="h-px flex-1 overflow-hidden bg-[var(--color-border)]">
        <div
          className={cn(
            "h-full transition-all",
            getScoreBarColor(clampedValue)
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="w-5 text-right font-mono text-[8px] text-[var(--color-text-muted)]">
        {Math.round(value)}
      </span>
    </div>
  );
}
