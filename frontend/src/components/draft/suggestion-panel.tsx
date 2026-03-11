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
        <CardTitle className="text-base">Suggested Picks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Pick or ban a champion to see suggestions.
          </p>
        ) : (
          <div className="space-y-2">
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
    <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 transition-colors hover:border-slate-700">
      <div className="flex items-center gap-3">
        <span className="w-5 text-center text-xs font-bold text-slate-500">
          {rank}
        </span>
        <Image
          src={getChampionIconUrl(suggestion.champion_name)}
          alt={suggestion.champion_name}
          width={32}
          height={32}
          className="rounded-lg"
          unoptimized
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {suggestion.champion_name}
            </span>
            <span
              className={cn(
                "text-sm font-bold",
                getScoreColor(suggestion.composite_score)
              )}
            >
              {suggestion.composite_score.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1 pl-8">
        <ScoreBreakdownBar
          label="Synergy"
          value={suggestion.synergy_contribution}
        />
        <ScoreBreakdownBar
          label="Counter"
          value={suggestion.counter_contribution}
        />
        <ScoreBreakdownBar
          label="Comfort"
          value={suggestion.comfort_contribution}
        />
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
      <span className="w-14 text-[10px] text-slate-500">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            getScoreBarColor(clampedValue)
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="w-6 text-right text-[10px] font-medium text-slate-400">
        {Math.round(value)}
      </span>
    </div>
  );
}
