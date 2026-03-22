"use client";

import { cn } from "@/lib/utils";

interface WinProbabilityProps {
  probability: number;
}

export function WinProbability({ probability }: WinProbabilityProps) {
  const clamped = Math.max(0, Math.min(100, probability));
  const isAhead = clamped >= 50;

  return (
    <div className="space-y-2 text-center">
      <p className="font-mono text-xs tracking-wider uppercase text-[var(--color-text-muted)]">
        Win Probability
      </p>
      <p
        className={cn(
          "font-mono text-2xl font-bold tracking-tight",
          isAhead ? "text-[var(--color-score-mid)]" : "text-[var(--color-danger)]"
        )}
      >
        {Math.round(clamped)}%
      </p>
      <div className="mx-auto h-0.5 max-w-[200px] overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isAhead ? "bg-[var(--color-accent)]" : "bg-[var(--color-danger)]"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--color-text-muted)]">
        {isAhead ? "Your Team" : "Opponent"}
      </p>
    </div>
  );
}
