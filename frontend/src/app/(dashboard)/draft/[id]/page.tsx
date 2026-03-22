"use client";

import { useEffect, use } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useDraft } from "@/lib/hooks/use-draft";
import { DraftBoard } from "@/components/draft/draft-board";
import { SuggestionPanel } from "@/components/draft/suggestion-panel";
import { ScoreDisplay } from "@/components/draft/score-display";
import { TeamComfortOverlay } from "@/components/draft/team-comfort-overlay";
import { PageLoader } from "@/components/ui/loading";
import Link from "next/link";

export default function LiveDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuthenticated } = useAuth();
  const draft = useDraft();

  useEffect(() => {
    if (id && !draft.sessionId) {
      draft.setSession(id, "clash");
    }
  }, [id, draft.sessionId, draft]);

  useEffect(() => {
    if (draft.sessionId) {
      const cleanup = draft.connectWebSocket();
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [draft.sessionId, draft.connectWebSocket]);

  useEffect(() => {
    return () => {
      draft.disconnectWebSocket();
    };
  }, [draft.disconnectWebSocket]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-xs text-[var(--color-text-muted)]">Sign in to use the draft assistant.</p>
        <Link
          href="/login"
          className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-500"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!draft.sessionId) {
    return <PageLoader message="Connecting..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">Live Draft</h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            {id.slice(0, 8)}... · {draft.mode} ·{" "}
            <span className="text-amber-500">
              {draft.currentPhase.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <Link
          href="/draft"
          className="text-[10px] tracking-wider uppercase text-[var(--color-text-muted)] transition-colors hover:text-white"
        >
          Exit
        </Link>
      </div>

      <ScoreDisplay scores={draft.scores} loading={draft.scoresLoading} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DraftBoard
            bluePicks={draft.bluePicks}
            redPicks={draft.redPicks}
            blueBans={draft.blueBans}
            redBans={draft.redBans}
            currentPhase={draft.currentPhase}
            activeSide={draft.activeSide}
            onPick={(championId, role) => {
              draft.addPick({
                champion_id: championId,
                side: draft.activeSide,
                role,
              });
            }}
            onBan={(championId) => {
              draft.addBan({
                champion_id: championId,
                side: draft.activeSide,
              });
            }}
            isAddingPick={draft.isAddingPick}
            isAddingBan={draft.isAddingBan}
          />
        </div>
        <div className="space-y-6">
          <SuggestionPanel
            suggestions={draft.suggestions}
            loading={draft.suggestionsLoading}
          />
          <TeamComfortOverlay
            comfortScores={draft.scores?.comfort_scores || []}
          />
        </div>
      </div>
    </div>
  );
}
