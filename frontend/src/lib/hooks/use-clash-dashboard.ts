"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClashStore } from "@/lib/stores/clash-store";
import { api } from "@/lib/api";
import type {
  AnalyzeChampionEntry,
  ChampionPoolResponse,
  ChampionSuggestion,
  RadarDataPoint,
  TeamPlayer,
} from "@/types";

interface BanTarget {
  champion_id: number;
  champion_name: string;
  comfort_score: number;
}

export function useClashDashboard() {
  const clashStore = useClashStore();
  const { yourTeam, opponentTeam, yourBans, opponentBans } = clashStore;

  // --- Dynamic patch resolution ---
  const patchQuery = useQuery({
    queryKey: ["latest-patch"],
    queryFn: () => api.getLatestPatch(),
    staleTime: 30 * 60 * 1000, // 30 min
  });
  const currentPatch = patchQuery.data?.patch ?? "unknown";

  // --- Pool queries for each side ---
  const yourPuuids = yourTeam.filter(Boolean).map((p) => p!.puuid);
  const opponentPuuids = opponentTeam.filter(Boolean).map((p) => p!.puuid);

  const yourPoolQueries = useQuery({
    queryKey: ["clash-your-pools", yourPuuids],
    queryFn: async () => {
      const results = await Promise.all(
        yourPuuids.map((puuid) =>
          api.getSummonerChampionPool(puuid).catch(() => ({
            user_id: puuid,
            champions: [],
            total_champions: 0,
          }))
        )
      );
      return results;
    },
    enabled: yourPuuids.length > 0,
    staleTime: 30 * 1000, // 30s — short so post-ingestion refetch picks up new data
  });

  const opponentPoolQueries = useQuery({
    queryKey: ["clash-opponent-pools", opponentPuuids],
    queryFn: async () => {
      const results = await Promise.all(
        opponentPuuids.map((puuid) =>
          api.getSummonerChampionPool(puuid).catch(() => ({
            user_id: puuid,
            champions: [],
            total_champions: 0,
          }))
        )
      );
      return results;
    },
    enabled: opponentPuuids.length > 0,
    staleTime: 30 * 1000,
  });

  // --- Build per-player pool arrays aligned to 5 slots ---
  const yourPools = useMemo<(ChampionPoolResponse | null)[]>(() => {
    if (!yourPoolQueries.data) return [null, null, null, null, null];
    const result: (ChampionPoolResponse | null)[] = [];
    let dataIdx = 0;
    for (let i = 0; i < 5; i++) {
      if (yourTeam[i]) {
        result.push(yourPoolQueries.data[dataIdx] ?? null);
        dataIdx++;
      } else {
        result.push(null);
      }
    }
    return result;
  }, [yourPoolQueries.data, yourTeam]);

  const opponentPools = useMemo<(ChampionPoolResponse | null)[]>(() => {
    if (!opponentPoolQueries.data) return [null, null, null, null, null];
    const result: (ChampionPoolResponse | null)[] = [];
    let dataIdx = 0;
    for (let i = 0; i < 5; i++) {
      if (opponentTeam[i]) {
        result.push(opponentPoolQueries.data[dataIdx] ?? null);
        dataIdx++;
      } else {
        result.push(null);
      }
    }
    return result;
  }, [opponentPoolQueries.data, opponentTeam]);

  // --- Build analyze draft request key from current picks ---
  const allyChampions: AnalyzeChampionEntry[] = useMemo(
    () =>
      yourTeam
        .filter((p): p is TeamPlayer => p !== null && !!p.selected_champion)
        .map((p) => ({
          champion_id: p.selected_champion!.id,
          champion_name: p.selected_champion!.name,
          role: p.role,
        })),
    [yourTeam]
  );

  const opponentChampions: AnalyzeChampionEntry[] = useMemo(
    () =>
      opponentTeam
        .filter((p): p is TeamPlayer => p !== null && !!p.selected_champion)
        .map((p) => ({
          champion_id: p.selected_champion!.id,
          champion_name: p.selected_champion!.name,
          role: p.role,
        })),
    [opponentTeam]
  );

  const hasAnyChampions = allyChampions.length > 0 || opponentChampions.length > 0;

  const allyBanIds = useMemo(
    () => yourBans.filter((b): b is { id: number; name: string } => b !== null).map((b) => b.id),
    [yourBans]
  );
  const opponentBanIds = useMemo(
    () => opponentBans.filter((b): b is { id: number; name: string } => b !== null).map((b) => b.id),
    [opponentBans]
  );

  // --- Call analyze endpoint whenever picks/bans change ---
  const analyzeQuery = useQuery({
    queryKey: [
      "clash-analyze",
      allyChampions.map((c) => c.champion_id),
      opponentChampions.map((c) => c.champion_id),
      allyBanIds,
      opponentBanIds,
      yourPuuids,
    ],
    queryFn: () =>
      api.analyzeDraft({
        ally_champions: allyChampions,
        opponent_champions: opponentChampions,
        ally_bans: allyBanIds,
        opponent_bans: opponentBanIds,
        team_puuids: yourPuuids,
        patch: currentPatch,
      }),
    enabled: hasAnyChampions && currentPatch !== "unknown",
    staleTime: 30 * 1000,
  });

  // --- Derive radar data from real scores if available ---
  const radarData = useMemo<RadarDataPoint[]>(() => {
    const scores = analyzeQuery.data;
    if (scores) {
      const syn = scores.synergy_score;
      const ctr = scores.counter_score;
      const total = scores.total_score;
      return [
        { axis: "Synergy", yourTeam: syn, opponentTeam: Math.max(100 - syn, 20) },
        { axis: "Counter Adv.", yourTeam: ctr, opponentTeam: Math.max(100 - ctr, 20) },
        { axis: "Composite", yourTeam: total, opponentTeam: Math.max(100 - total, 20) },
        { axis: "Team Depth", yourTeam: yourTeam.filter(Boolean).length * 20, opponentTeam: opponentTeam.filter(Boolean).length * 20 },
        { axis: "Comfort", yourTeam: scores.comfort_scores.length > 0 ? scores.comfort_scores.reduce((s, c) => s + c.comfort_score, 0) / scores.comfort_scores.length : 50, opponentTeam: 50 },
        { axis: "Pick Variety", yourTeam: allyChampions.length * 20, opponentTeam: opponentChampions.length * 20 },
      ];
    }
    // Fallback heuristic
    const yourFilled = yourTeam.filter(Boolean).length;
    const oppFilled = opponentTeam.filter(Boolean).length;
    const yourBase = yourFilled > 0 ? 40 + yourFilled * 8 : 0;
    const oppBase = oppFilled > 0 ? 30 + oppFilled * 6 : 0;
    return [
      { axis: "Synergy", yourTeam: Math.min(yourBase + 12, 100), opponentTeam: oppBase + 5 },
      { axis: "Counter Adv.", yourTeam: Math.min(yourBase + 5, 100), opponentTeam: oppBase + 10 },
      { axis: "Composite", yourTeam: Math.min(yourBase + 8, 100), opponentTeam: oppBase },
      { axis: "Team Depth", yourTeam: yourFilled * 20, opponentTeam: oppFilled * 20 },
      { axis: "Comfort", yourTeam: Math.min(yourBase + 2, 100), opponentTeam: oppBase + 8 },
      { axis: "Pick Variety", yourTeam: Math.min(yourBase + 10, 100), opponentTeam: oppBase + 12 },
    ];
  }, [analyzeQuery.data, yourTeam, opponentTeam, allyChampions, opponentChampions]);

  // --- Win probability from real scores ---
  const winProbability = useMemo(() => {
    if (analyzeQuery.data) {
      return Math.min(Math.max(40 + (analyzeQuery.data.total_score - 50) * 0.4, 20), 80);
    }
    return 50 + yourTeam.filter(Boolean).length * 2.5;
  }, [analyzeQuery.data, yourTeam]);

  // --- Suggestions from analyze response ---
  const suggestions = useMemo<ChampionSuggestion[]>(
    () => analyzeQuery.data?.suggestions ?? [],
    [analyzeQuery.data]
  );

  // --- Ban targets from real opponent pool data ---
  const banTargets = useMemo<BanTarget[]>(() => {
    const pools = opponentPoolQueries.data;
    if (pools && pools.length > 0) {
      return pools
        .filter((p): p is ChampionPoolResponse => p !== null)
        .flatMap((pool) =>
          pool.champions.map((c) => ({
            champion_id: c.champion_id,
            champion_name: c.champion_name,
            comfort_score: c.true_mastery,
          }))
        )
        .sort((a, b) => b.comfort_score - a.comfort_score);
    }
    // Fallback to player.top_champions (legacy)
    return opponentTeam
      .filter(Boolean)
      .flatMap((p) =>
        p!.top_champions.map((c) => ({
          champion_id: c.champion_id,
          champion_name: c.champion_name,
          comfort_score: c.true_mastery,
        }))
      )
      .sort((a, b) => b.comfort_score - a.comfort_score);
  }, [opponentPoolQueries.data, opponentTeam]);

  return {
    // Store state & actions
    ...clashStore,
    // Derived data
    radarData,
    winProbability,
    banTargets,
    // Draft analysis
    suggestions,
    suggestionsLoading: analyzeQuery.isLoading && hasAnyChampions,
    analysisScores: analyzeQuery.data ?? null,
    // Pool data (aligned to 5 slots)
    yourPools,
    opponentPools,
    yourPoolsLoading: yourPoolQueries.isLoading,
    opponentPoolsLoading: opponentPoolQueries.isLoading,
  };
}
