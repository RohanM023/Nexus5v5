"use client";

import { useEffect, use } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useDraft } from "@/lib/hooks/use-draft";
import { DraftBoard } from "@/components/draft/draft-board";
import { SuggestionPanel } from "@/components/draft/suggestion-panel";
import { ScoreDisplay } from "@/components/draft/score-display";
import { TeamComfortOverlay } from "@/components/draft/team-comfort-overlay";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
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

  if (!draft.sessionId) {
    return <PageLoader message="Connecting to draft session..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Draft</h1>
          <p className="mt-1 text-sm text-slate-400">
            Session: {id.slice(0, 8)}... &middot;{" "}
            <span className="capitalize">{draft.mode}</span> &middot;{" "}
            Phase:{" "}
            <span className="text-blue-400">
              {draft.currentPhase.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <Link
          href="/draft"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Exit Draft
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
