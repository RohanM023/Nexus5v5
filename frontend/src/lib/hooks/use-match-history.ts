"use client";

import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface MatchHistoryFilters {
  queue?: number;
  champion?: string;
  startDate?: string;
  endDate?: string;
}

export function useMatchHistory(puuid?: string, filters?: MatchHistoryFilters) {
  return useInfiniteQuery({
    queryKey: [
      "match-history",
      puuid,
      filters?.queue,
      filters?.champion,
      filters?.startDate,
      filters?.endDate,
    ],
    queryFn: async ({ pageParam }) => {
      return api.getMatchHistory(
        puuid!,
        pageParam ?? undefined,
        filters?.queue,
        filters?.champion,
        filters?.startDate,
        filters?.endDate
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? lastPage.pagination.cursor : undefined,
    enabled: !!puuid,
  });
}

export function useGoldDiff(matchId?: string) {
  return useQuery({
    queryKey: ["gold-diff", matchId],
    queryFn: () => api.getGoldDiff(matchId!),
    enabled: !!matchId,
  });
}

export function useTriggerIngestion() {
  return useMutation({
    mutationFn: (puuid: string) => api.triggerIngestion(puuid),
  });
}
