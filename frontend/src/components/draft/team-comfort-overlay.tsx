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
          <CardTitle className="text-base">Team Comfort</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-slate-500">
            Comfort scores will appear as picks are made.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Comfort</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {comfortScores.map((entry) => {
          const isPerfectFit = entry.comfort_score >= 80;
          return (
            <div
              key={`${entry.puuid}-${entry.champion_id}`}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isPerfectFit
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-slate-800 bg-slate-800/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {entry.champion_name}
                  </span>
                  {isPerfectFit && (
                    <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                      PERFECT FIT
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-bold",
                    getScoreColor(entry.comfort_score)
                  )}
                >
                  {entry.comfort_score.toFixed(0)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    getScoreBarColor(entry.comfort_score)
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(0, entry.comfort_score))}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                {entry.puuid.slice(0, 8)}...
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
