"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/lib/hooks/use-draft";
import { useAuth } from "@/lib/hooks/use-auth";
import { useFearlessStore, type SeriesFormat } from "@/lib/stores/fearless-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const MODES = [
  {
    value: "clash" as const,
    label: "Clash",
    description: "Standard Clash 5v5 draft with tournament format pick/ban order.",
  },
  {
    value: "custom" as const,
    label: "Custom",
    description: "Flexible draft for custom games with your own rules.",
  },
  {
    value: "scrim" as const,
    label: "Scrim",
    description: "Practice draft for scrimmage matches against known opponents.",
  },
];

const FORMATS: { value: SeriesFormat; label: string }[] = [
  { value: "bo3", label: "Best of 3" },
  { value: "bo5", label: "Best of 5" },
];

export default function DraftLauncherPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { createSession, isCreatingSession } = useDraft();
  const [selectedMode, setSelectedMode] = useState<"clash" | "custom" | "scrim">("clash");

  const fearless = useFearlessStore();
  const [fearlessToggle, setFearlessToggle] = useState(fearless.active);
  const [selectedFormat, setSelectedFormat] = useState<SeriesFormat>(fearless.format);

  const lockedCount = fearless.active ? fearless.getAllLockedIds().length : 0;
  const maxGames = fearless.active ? fearless.getMaxGames() : 0;
  const seriesOver = fearless.active && fearless.isSeriesOver();

  const handleToggleFearless = () => {
    if (fearlessToggle) {
      fearless.resetSeries();
      setFearlessToggle(false);
    } else {
      fearless.startSeries(selectedFormat);
      setFearlessToggle(true);
    }
  };

  const handleFormatChange = (format: SeriesFormat) => {
    setSelectedFormat(format);
    if (fearless.active) {
      fearless.startSeries(format);
    }
  };

  const handleCreateSession = async () => {
    try {
      const session = await createSession({ mode: selectedMode });
      router.push(`/draft/${session.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {!isAuthenticated && (
        <div className="border-l-2 border-amber-600/50 bg-amber-600/5 px-4 py-2 text-xs text-amber-400">
          Sign in to save drafts and see personalized comfort scores.{" "}
          <Link href="/login" className="underline hover:text-amber-300">
            Sign In
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Draft Assistant</h1>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Real-time synergy, counter, and comfort scoring.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-medium tracking-wider uppercase text-[var(--color-text-muted)]">Select Mode</p>
        {MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setSelectedMode(mode.value)}
            className={cn(
              "w-full rounded-md p-4 text-left transition-all",
              selectedMode === mode.value
                ? "bg-[var(--color-surface)] ring-1 ring-[var(--color-accent)]/40"
                : "bg-transparent hover:bg-[var(--color-surface)]"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-primary)]">{mode.label}</span>
              <div
                className={cn(
                  "h-3 w-3 rounded-full border",
                  selectedMode === mode.value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                    : "border-[var(--color-text-muted)]"
                )}
              />
            </div>
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{mode.description}</p>
          </button>
        ))}
      </div>

      {/* Fearless Series Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium tracking-wider uppercase text-[var(--color-text-muted)]">
              Fearless Series
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              Lock out champions picked in previous games
            </p>
          </div>
          <button
            onClick={handleToggleFearless}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              fearlessToggle
                ? "bg-[var(--color-accent)]"
                : "bg-[var(--color-border)]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[var(--background)] transition-transform",
                fearlessToggle && "translate-x-4"
              )}
            />
          </button>
        </div>

        {fearlessToggle && (
          <div className="space-y-3 rounded-md bg-[var(--color-surface)] p-4">
            {/* Format selector */}
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleFormatChange(f.value)}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 text-[10px] font-medium tracking-wider transition-all",
                    (fearless.active ? fearless.format : selectedFormat) === f.value
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-text)] ring-1 ring-[var(--color-accent)]/30"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Series status */}
            {fearless.active && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {seriesOver
                      ? "Series complete"
                      : `Game ${fearless.currentGame} of ${maxGames}`}
                  </span>
                  {lockedCount > 0 && (
                    <span className="rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-accent-text)]">
                      {lockedCount} locked
                    </span>
                  )}
                </div>

                {/* Game progress dots */}
                <div className="flex gap-1.5">
                  {Array.from({ length: maxGames }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i < fearless.currentGame - 1
                          ? "bg-[var(--color-accent)]"
                          : i === fearless.currentGame - 1 && !seriesOver
                            ? "bg-[var(--color-accent)]/40"
                            : "bg-[var(--color-border)]"
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    fearless.resetSeries();
                    setFearlessToggle(false);
                  }}
                  className="text-[10px] tracking-wider text-[var(--color-text-muted)] underline transition-colors hover:text-[var(--color-text-primary)]"
                >
                  Reset Series
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleCreateSession}
        isLoading={isCreatingSession}
        disabled={seriesOver}
      >
        {fearless.active
          ? seriesOver
            ? "Series Complete"
            : `Start Game ${fearless.currentGame}`
          : "Start Draft"}
      </Button>
    </div>
  );
}
