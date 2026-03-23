"use client";

import { useEffect, useRef, use } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useDraft } from "@/lib/hooks/use-draft";
import { useFearlessStore } from "@/lib/stores/fearless-store";
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
  const fearless = useFearlessStore();
  const gameRecorded = useRef(false);

  const fearlessLockedIds = fearless.active ? fearless.getAllLockedIds() : [];

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

  // Auto-record game completion for fearless series
  useEffect(() => {
    if (
      draft.currentPhase === "completed" &&
      fearless.active &&
      !gameRecorded.current &&
      draft.bluePicks.length > 0
    ) {
      gameRecorded.current = true;
      fearless.completeGame(
        draft.bluePicks.map((p) => p.champion_id),
        draft.redPicks.map((p) => p.champion_id),
      );
    }
  }, [draft.currentPhase, fearless.active, draft.bluePicks, draft.redPicks, fearless]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-xs text-[var(--color-text-muted)]">Sign in to use the draft assistant.</p>
        <Link
          href="/login"
          className="rounded-md bg-[var(--color-accent-bg)] px-4 py-1.5 text-xs font-medium text-black hover:bg-[var(--color-accent-bg-hover)]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!draft.sessionId) {
    return <PageLoader message="Connecting..." />;
  }

  const maxGames = fearless.getMaxGames();

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Live Draft</h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            {id.slice(0, 8)}... · {draft.mode} ·{" "}
            <span className="text-[var(--color-accent-text)]">
              {draft.currentPhase.replace(/_/g, " ")}
            </span>
            {fearless.active && (
              <span className="ml-2 rounded bg-[var(--color-accent)]/15 px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-accent-text)]">
                FEARLESS G{fearless.currentGame}/{maxGames}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/draft"
          className="text-[10px] tracking-wider uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
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
            fearlessLockedIds={fearlessLockedIds}
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
