import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DraftState,
  DraftSuggestion,
  ScoreBreakdown,
} from "../types";
import { useNexus } from "./use-nexus";

interface UseNexusDraftReturn {
  sessionId: string | null;
  scores: ScoreBreakdown | null;
  suggestions: DraftSuggestion[];
  loading: boolean;
  error: string | null;
  createSession: (mode?: "clash" | "custom" | "scrim") => Promise<void>;
  pick: (championId: number, position: string) => Promise<void>;
  ban: (championId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook that manages a draft session lifecycle:
 * create session, pick/ban champions, and fetch scores + suggestions.
 */
export function useNexusDraft(): UseNexusDraftReturn {
  const { client } = useNexus();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreBreakdown | null>(null);
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchScoresAndSuggestions = useCallback(
    async (sid: string) => {
      try {
        const [scoreData, suggData] = await Promise.all([
          client.getDraftScores(sid),
          client.getDraftSuggestions(sid),
        ]);
        setScores(scoreData);
        setSuggestions(suggData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch scores");
      }
    },
    [client],
  );

  const createSession = useCallback(
    async (mode: "clash" | "custom" | "scrim" = "clash") => {
      setLoading(true);
      setError(null);
      try {
        const { session_id } = await client.createDraftSession(mode);
        setSessionId(session_id);
        await fetchScoresAndSuggestions(session_id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create session",
        );
      } finally {
        setLoading(false);
      }
    },
    [client, fetchScoresAndSuggestions],
  );

  const pick = useCallback(
    async (championId: number, position: string) => {
      if (!sessionId) return;
      setLoading(true);
      try {
        await client.registerPick(sessionId, championId, position);
        await fetchScoresAndSuggestions(sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pick failed");
      } finally {
        setLoading(false);
      }
    },
    [client, sessionId, fetchScoresAndSuggestions],
  );

  const ban = useCallback(
    async (championId: number) => {
      if (!sessionId) return;
      setLoading(true);
      try {
        await client.registerBan(sessionId, championId);
        await fetchScoresAndSuggestions(sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ban failed");
      } finally {
        setLoading(false);
      }
    },
    [client, sessionId, fetchScoresAndSuggestions],
  );

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    await fetchScoresAndSuggestions(sessionId);
  }, [sessionId, fetchScoresAndSuggestions]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    sessionId,
    scores,
    suggestions,
    loading,
    error,
    createSession,
    pick,
    ban,
    refresh,
  };
}
