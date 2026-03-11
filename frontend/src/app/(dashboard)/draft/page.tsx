"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/lib/hooks/use-draft";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-slate-400">Please sign in to use the draft assistant.</p>
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleCreateSession = async () => {
    try {
      const session = await createSession({ mode: selectedMode });
      router.push(`/draft/${session.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Draft Assistant</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create a draft session with real-time synergy, counter, and comfort scoring.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setSelectedMode(mode.value)}
              className={cn(
                "w-full rounded-lg border p-4 text-left transition-all",
                selectedMode === mode.value
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{mode.label}</span>
                <div
                  className={cn(
                    "h-4 w-4 rounded-full border-2",
                    selectedMode === mode.value
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-600"
                  )}
                />
              </div>
              <p className="mt-1 text-sm text-slate-400">{mode.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleCreateSession}
        isLoading={isCreatingSession}
      >
        Start Draft Session
      </Button>
    </div>
  );
}
