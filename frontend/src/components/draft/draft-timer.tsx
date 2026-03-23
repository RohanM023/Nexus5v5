"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { DraftPhase } from "@/types";

interface DraftTimerProps {
  phase: DraftPhase;
  activeSide: "blue" | "red";
}

const TIMER_SECONDS = 30;

export function DraftTimer({ phase, activeSide }: DraftTimerProps) {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset timer when phase changes
    setTimeLeft(TIMER_SECONDS);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  if (phase === "completed") return null;

  const percentage = (timeLeft / TIMER_SECONDS) * 100;
  const isWarning = timeLeft <= 10;
  const isDanger = timeLeft <= 5;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
          Timer
        </span>
        <span
          className={cn(
            "font-mono text-lg font-bold tabular-nums",
            isDanger
              ? "animate-pulse text-[var(--color-danger)]"
              : isWarning
                ? "text-[var(--color-warning)]"
                : "text-[var(--color-text-primary)]"
          )}
        >
          {timeLeft}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className={cn(
            "h-full transition-all duration-1000 ease-linear",
            isDanger
              ? "bg-[var(--color-danger)]"
              : isWarning
                ? "bg-[var(--color-warning)]"
                : activeSide === "blue"
                  ? "bg-[var(--color-team-blue)]"
                  : "bg-[var(--color-team-red)]"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
