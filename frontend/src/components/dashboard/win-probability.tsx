"use client";

import { cn } from "@/lib/utils";

interface WinProbabilityProps {
  probability: number; // 0-100
}

export function WinProbability({ probability }: WinProbabilityProps) {
  const clamped = Math.max(0, Math.min(100, probability));
  const isAhead = clamped >= 50;

  return (
    <div className="space-y-2 text-center">
      <p className="text-sm font-bold tracking-wide text-white">
        WIN PROBABILITY:{" "}
        <span
          className={cn(
            "text-lg",
            isAhead ? "text-teal-400" : "text-red-400"
          )}
        >
          {Math.round(clamped)}%
        </span>{" "}
        <span className="text-slate-400">
          for {isAhead ? "YOUR TEAM" : "OPPONENT"}
        </span>
      </p>
      <div className="mx-auto h-2.5 max-w-sm overflow-hidden rounded-full bg-slate-700">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isAhead
              ? "bg-gradient-to-r from-teal-500 to-teal-400"
              : "bg-gradient-to-r from-red-500 to-red-400"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
