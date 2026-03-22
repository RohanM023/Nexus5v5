"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/lib/hooks/use-draft";
import { useAuth } from "@/lib/hooks/use-auth";
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

export default function DraftLauncherPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { createSession, isCreatingSession } = useDraft();
  const [selectedMode, setSelectedMode] = useState<"clash" | "custom" | "scrim">("clash");

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
        <h1 className="text-lg font-semibold tracking-tight text-white">Draft Assistant</h1>
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
                ? "bg-[var(--color-surface)] ring-1 ring-amber-600/40"
                : "bg-transparent hover:bg-[var(--color-surface)]"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">{mode.label}</span>
              <div
                className={cn(
                  "h-3 w-3 rounded-full border",
                  selectedMode === mode.value
                    ? "border-amber-500 bg-amber-500"
                    : "border-[var(--color-text-muted)]"
                )}
              />
            </div>
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{mode.description}</p>
          </button>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleCreateSession}
        isLoading={isCreatingSession}
      >
        Start Draft
      </Button>
    </div>
  );
}
