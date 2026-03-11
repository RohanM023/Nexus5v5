"use client";

import { Card, CardContent } from "@/components/ui/card";
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
          {isAvg && (
            <span className="ml-1 normal-case text-slate-600">(avg)</span>
          )}
        </p>
        <p className={cn("mt-1 text-2xl font-bold", getScoreColor(value))}>
          {value.toFixed(0)}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              getScoreBarColor(value)
            )}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
