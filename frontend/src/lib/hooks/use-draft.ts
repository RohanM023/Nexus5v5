"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDraftStore } from "@/lib/stores/draft-store";
import type { DraftBanRequest, DraftPickRequest } from "@/types";

export function useDraft() {
  const store = useDraftStore();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const scoresQuery = useQuery({
    queryKey: ["draft-scores", store.sessionId],
    queryFn: () => api.getDraftScores(store.sessionId!),
    enabled: !!store.sessionId && store.status === "in_progress",
    refetchInterval: false,
  });

  const suggestionsQuery = useQuery({
    queryKey: ["draft-suggestions", store.sessionId],
    queryFn: () => api.getDraftSuggestions(store.sessionId!),
    enabled: !!store.sessionId && store.status === "in_progress",
    refetchInterval: false,
  });

  useEffect(() => {
    if (scoresQuery.data) {
      store.setScores(scoresQuery.data);
    }
  }, [scoresQuery.data, store]);

  useEffect(() => {
    if (suggestionsQuery.data) {
      store.setSuggestions(suggestionsQuery.data);
    }
  }, [suggestionsQuery.data, store]);

  const createSessionMutation = useMutation({
    mutationFn: ({
      mode,
      teamId,
    }: {
      mode: "clash" | "custom" | "scrim";
      teamId?: string;
    }) => api.createDraftSession(mode, teamId),
    onSuccess: (session) => {
      store.setSession(session.id, session.mode);
      store.updateFromSession(session);
    },
  });

  const addPickMutation = useMutation({
    mutationFn: (data: DraftPickRequest) =>
      api.addPick(store.sessionId!, data),
    onSuccess: (session) => {
      store.updateFromSession(session);
      queryClient.invalidateQueries({
        queryKey: ["draft-scores", store.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["draft-suggestions", store.sessionId],
      });
    },
  });

  const addBanMutation = useMutation({
    mutationFn: (data: DraftBanRequest) =>
      api.addBan(store.sessionId!, data),
    onSuccess: (session) => {
      store.updateFromSession(session);
      queryClient.invalidateQueries({
        queryKey: ["draft-scores", store.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["draft-suggestions", store.sessionId],
      });
    },
  });

  const connectWebSocket = useCallback(() => {
    if (!store.sessionId) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(
      `${wsUrl}/api/v1/draft/live/${store.sessionId}`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "draft_update") {
        store.updateFromSession(data.session);
        if (data.scores) {
          store.setScores(data.scores);
        }
        if (data.suggestions) {
          store.setSuggestions(data.suggestions);
        }
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [store]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  return {
    ...store,
    scoresLoading: scoresQuery.isLoading,
    suggestionsLoading: suggestionsQuery.isLoading,
    createSession: createSessionMutation.mutateAsync,
    isCreatingSession: createSessionMutation.isPending,
    addPick: addPickMutation.mutateAsync,
    isAddingPick: addPickMutation.isPending,
    addBan: addBanMutation.mutateAsync,
    isAddingBan: addBanMutation.isPending,
    connectWebSocket,
    disconnectWebSocket,
  };
}
