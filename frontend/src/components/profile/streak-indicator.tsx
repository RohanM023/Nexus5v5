"use client";

import type { MatchSummary } from "@/types";

function computeStreak(matches: MatchSummary[]): { count: number; winning: boolean } | null {
  if (matches.length === 0) return null;

  const first = matches[0].win;
  let count = 1;
  for (let i = 1; i < matches.length; i++) {
    if (matches[i].win !== first) break;
    count++;
  }

  if (count < 2) return null;
  return { count, winning: first };
}

interface StreakIndicatorProps {
  matches: MatchSummary[];
}

export function StreakIndicator({ matches }: StreakIndicatorProps) {
  const streak = computeStreak(matches);
  if (!streak) return null;

  return (
    <span
      className={`font-mono text-[10px] font-bold ${
        streak.winning
          ? "text-[var(--color-success)]"
          : "text-[var(--color-danger)]"
      }`}
    >
      {streak.count}{streak.winning ? "W" : "L"} STREAK
    </span>
  );
}
