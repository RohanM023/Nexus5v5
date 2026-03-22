"use client";

import { Skeleton } from "@/components/ui/loading";
import { cn, getScoreColor, getScoreBarColor } from "@/lib/utils";
import type { DraftScores } from "@/types";

interface ScoreDisplayProps {
  scores: DraftScores | null;
  loading: boolean;
}

export function ScoreDisplay({ scores, loading }: ScoreDisplayProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-md bg-[var(--color-surface)] p-4">
            <Skeleton className="mb-2 h-2 w-12" />
            <Skeleton className="h-6 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScoreCard label="Total" value={0} />
        <ScoreCard label="Synergy" value={0} />
        <ScoreCard label="Counter" value={0} />
        <ScoreCard label="Comfort" value={0} isAvg />
      </div>
    );
  }

  const avgComfort =
    scores.comfort_scores.length > 0
      ? scores.comfort_scores.reduce((sum, c) => sum + c.comfort_score, 0) /
        scores.comfort_scores.length
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <ScoreCard label="Total" value={scores.total_score} />
      <ScoreCard label="Synergy" value={scores.synergy_score} />
      <ScoreCard label="Counter" value={scores.counter_score} />
      <ScoreCard label="Comfort" value={avgComfort} isAvg />
    </div>
  );
}

function ScoreCard({
  label,
  value,
  isAvg,
}: {
  label: string;
  value: number;
  isAvg?: boolean;
}) {
  return (
    <div className="rounded-md bg-[var(--color-surface)] p-4">
      <p className="font-mono text-[8px] tracking-wider uppercase text-[var(--color-text-muted)]">
        {label}
        {isAvg && <span className="ml-1 lowercase">(avg)</span>}
      </p>
      <p className={cn("mt-1 font-mono text-2xl font-bold tracking-tight", getScoreColor(value))}>
        {value.toFixed(0)}
      </p>
      <div className="mt-2 h-px overflow-hidden bg-[var(--color-border)]">
        <div
          className={cn(
            "h-full transition-all duration-500",
            getScoreBarColor(value)
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
