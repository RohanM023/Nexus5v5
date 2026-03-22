"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, getScoreColor, getScoreBarColor } from "@/lib/utils";
import type { ComfortEntry } from "@/types";

interface TeamComfortOverlayProps {
  comfortScores: ComfortEntry[];
}

export function TeamComfortOverlay({ comfortScores }: TeamComfortOverlayProps) {
  if (comfortScores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Comfort</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
            Scores appear as picks are made.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Comfort</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {comfortScores.map((entry) => {
          const isPerfectFit = entry.comfort_score >= 80;
          return (
            <div
              key={`${entry.puuid}-${entry.champion_id}`}
              className={cn(
                "rounded px-3 py-2.5",
                isPerfectFit
                  ? "bg-emerald-500/5"
                  : "bg-transparent"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">
                    {entry.champion_name}
                  </span>
                  {isPerfectFit && (
                    <span className="font-mono text-[7px] tracking-wider uppercase text-emerald-500">
                      Perfect
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "font-mono text-xs font-bold",
                    getScoreColor(entry.comfort_score)
                  )}
                >
                  {entry.comfort_score.toFixed(0)}
                </span>
              </div>
              <div className="mt-1.5 h-px overflow-hidden bg-[var(--color-border)]">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    getScoreBarColor(entry.comfort_score)
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(0, entry.comfort_score))}%`,
                  }}
                />
              </div>
              <p className="mt-1 font-mono text-[7px] text-[var(--color-text-muted)]">
                {entry.puuid.slice(0, 8)}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
