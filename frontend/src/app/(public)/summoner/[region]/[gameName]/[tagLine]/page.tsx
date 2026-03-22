"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { StatsOverview } from "@/components/profile/stats-overview";
import { ChampionPoolGrid } from "@/components/profile/champion-pool-grid";
import { RankedCard } from "@/components/profile/ranked-card";
import { RankProgression } from "@/components/charts/rank-progression";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, ErrorDisplay, Spinner } from "@/components/ui/loading";
import { MatchRow, MatchListHeader } from "@/components/match/match-row";
import { cn, getProfileIconUrl } from "@/lib/utils";
import { addRecentSearch } from "@/lib/recent-searches";
import type { MatchSummary } from "@/types";
import Image from "next/image";
import Link from "next/link";

const QUEUE_OPTIONS = [
  { value: undefined, label: "All" },
  { value: 420, label: "Ranked" },
  { value: 700, label: "Clash" },
] as const;

export default function SummonerPage() {
  const params = useParams();
  const region = params.region as string;
  const gameName = decodeURIComponent(params.gameName as string);
  const tagLine = decodeURIComponent(params.tagLine as string);
  const queryClient = useQueryClient();

  const [queue, setQueue] = useState<number | undefined>(undefined);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [ingestionJobId, setIngestionJobId] = useState<string | null>(null);
  const autoIngestTriggered = useRef(false);
  const recentSearchAdded = useRef(false);

  const summonerQuery = useQuery({
    queryKey: ["summoner", region, gameName, tagLine],
    queryFn: () => api.lookupSummoner(region, gameName, tagLine),
  });

  // Add to recent searches on successful lookup
  useEffect(() => {
    if (summonerQuery.data && !recentSearchAdded.current) {
      recentSearchAdded.current = true;
      addRecentSearch({ gameName, tagLine, region });
    }
  }, [summonerQuery.data, gameName, tagLine, region]);

  const performanceQuery = useQuery({
    queryKey: ["summoner-performance", summonerQuery.data?.puuid],
    queryFn: () => api.getSummonerPerformance(summonerQuery.data!.puuid),
    enabled: !!summonerQuery.data?.puuid,
  });

  const championPoolQuery = useQuery({
    queryKey: ["summoner-champion-pool", summonerQuery.data?.puuid],
    queryFn: () => api.getSummonerChampionPool(summonerQuery.data!.puuid),
    enabled: !!summonerQuery.data?.puuid,
  });

  const matchesQuery = useQuery({
    queryKey: ["summoner-matches", summonerQuery.data?.puuid, queue],
    queryFn: () => api.getSummonerMatches(summonerQuery.data!.puuid, undefined, queue),
    enabled: !!summonerQuery.data?.puuid,
  });

  const rankedQuery = useQuery({
    queryKey: ["summoner-ranked", region, gameName, tagLine],
    queryFn: () => api.getRankedData(region, gameName, tagLine),
    enabled: !!summonerQuery.data,
  });

  const ingestionStartTime = useRef<number>(0);

  const ingestionStatusQuery = useQuery({
    queryKey: ["ingestion-status", ingestionJobId],
    queryFn: () => api.getIngestionStatus(ingestionJobId!),
    enabled: !!ingestionJobId,
    refetchInterval: 2000,
  });

  // When ingestion starts, record the start time
  useEffect(() => {
    if (ingestionJobId) {
      ingestionStartTime.current = Date.now();
    }
  }, [ingestionJobId]);

  useEffect(() => {
    if (!ingestionJobId) return;
    const status = ingestionStatusQuery.data?.status;

    if (status === "complete" || status === "not_found") {
      setIngestionJobId(null);
      queryClient.invalidateQueries({ queryKey: ["summoner-performance"] });
      queryClient.invalidateQueries({ queryKey: ["summoner-champion-pool"] });
      queryClient.invalidateQueries({ queryKey: ["summoner-matches"] });
      return;
    }

    // Timeout: stop polling after 30s and refresh data with whatever was inserted
    if (ingestionStartTime.current && Date.now() - ingestionStartTime.current > 30_000) {
      setIngestionJobId(null);
      queryClient.invalidateQueries({ queryKey: ["summoner-performance"] });
      queryClient.invalidateQueries({ queryKey: ["summoner-champion-pool"] });
      queryClient.invalidateQueries({ queryKey: ["summoner-matches"] });
    }
  }, [ingestionStatusQuery.data?.status, ingestionJobId, queryClient]);

  const triggerIngest = useCallback(async (puuid: string) => {
    try {
      const res = await api.triggerIngestion(puuid, { region, count: 10 });
      if (res.job_id) {
        setIngestionJobId(res.job_id);
      }
    } catch {
      // Silently fail for auto-ingest
    }
  }, [region]);

  useEffect(() => {
    if (autoIngestTriggered.current) return;
    if (!summonerQuery.data?.puuid) return;
    if (performanceQuery.isLoading || matchesQuery.isLoading) return;
    if (ingestionJobId) return;

    const hasNoData =
      (!performanceQuery.data || performanceQuery.data.total_games === 0) &&
      (!matchesQuery.data || matchesQuery.data.data.length === 0);

    if (hasNoData) {
      autoIngestTriggered.current = true;
      triggerIngest(summonerQuery.data.puuid);
    }
  }, [
    summonerQuery.data?.puuid,
    performanceQuery.isLoading,
    performanceQuery.data,
    matchesQuery.isLoading,
    matchesQuery.data,
    ingestionJobId,
    triggerIngest,
  ]);

  const isIngesting = !!ingestionJobId;

  const handleRefreshData = async () => {
    if (summonerQuery.data?.puuid && !isIngesting) {
      triggerIngest(summonerQuery.data.puuid);
    }
  };

  if (summonerQuery.isLoading) {
    return <PageLoader message={`Looking up ${gameName}#${tagLine}...`} />;
  }

  if (summonerQuery.error) {
    const isApiKeyError =
      summonerQuery.error instanceof ApiError &&
      (summonerQuery.error.code === "RIOT_API_ERROR" || summonerQuery.error.status === 502);
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorDisplay
          message={
            isApiKeyError
              ? "Riot API key is expired or invalid. Update RIOT_API_KEY in .env and restart the backend."
              : `Could not find summoner "${gameName}#${tagLine}" in ${region.toUpperCase()}.`
          }
          onRetry={() => summonerQuery.refetch()}
        />
        <div className="mt-4 text-center">
          <Link href="/" className="font-mono text-xs tracking-wider text-[var(--color-accent-text)] transition-colors hover:text-[var(--color-accent-hover)]">
            Try another search
          </Link>
        </div>
      </div>
    );
  }

  if (!summonerQuery.data) {
    return <ErrorDisplay message="No data available." />;
  }

  const summoner = summonerQuery.data;
  const performance = performanceQuery.data;
  const championPool = championPoolQuery.data;
  const matches = matchesQuery.data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <Image
          src={getProfileIconUrl(summoner.profile_icon_id)}
          alt="Profile Icon"
          width={56}
          height={56}
          className="rounded-sm"
          unoptimized
        />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            {summoner.game_name}
            <span className="text-[var(--color-text-muted)]">#{summoner.tag_line}</span>
          </h1>
          <div className="mt-1 flex items-center gap-2 font-mono text-[9px] text-[var(--color-text-muted)]">
            <span>{region.toUpperCase()}</span>
            <span>&middot;</span>
            <span>Lvl {summoner.summoner_level}</span>
          </div>
        </div>
        <button
          onClick={handleRefreshData}
          disabled={isIngesting}
          className="font-mono text-[10px] tracking-wider text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:opacity-40"
        >
          {isIngesting ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Ingesting
            </span>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      {/* Ingestion banner */}
      {isIngesting && (
        <div className="mt-4 flex items-center gap-2 border-l-2 border-[var(--color-accent)]/40 bg-[var(--color-accent)]/[0.03] px-4 py-2.5 font-mono text-[10px] text-[var(--color-accent-text)]/80">
          <Spinner size="sm" />
          Fetching match data from Riot...
        </div>
      )}

      {/* Ranked info */}
      {rankedQuery.data && rankedQuery.data.entries.length > 0 && (
        <div className="mt-4">
          <RankedCard entries={rankedQuery.data.entries} />
        </div>
      )}

      {/* Stats bar */}
      <div className="mt-5">
        {performanceQuery.isLoading ? (
          <PageLoader message="Loading stats..." />
        ) : performance && performance.total_games > 0 ? (
          <StatsOverview stats={performance} />
        ) : !isIngesting ? (
          <Card>
            <CardContent className="py-6 text-center text-xs text-[var(--color-text-muted)]">
              No performance data available yet.
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Rank Progression */}
      {rankedQuery.data && matches.length > 0 && (
        <div className="mt-5">
          <RankProgression
            soloEntry={rankedQuery.data.entries.find(e => e.queue_type === "RANKED_SOLO_5x5") ?? null}
            matches={matches.filter(m => m.queue_id === 420)}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="mt-5 flex flex-col gap-5 lg:flex-row">
        {/* Left sidebar: Champion Pool */}
        <div className="w-full lg:w-[280px] lg:shrink-0">
          {championPoolQuery.isLoading ? (
            <PageLoader message="Loading champions..." />
          ) : championPool && championPool.champions.length > 0 ? (
            <ChampionPoolGrid champions={championPool.champions} variant="compact" />
          ) : !isIngesting ? (
            <Card>
              <CardContent className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                No champion data yet.
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right main: Match History */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--color-text-secondary)]">
              Match History
            </h2>
            <div className="flex gap-1">
              {QUEUE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setQueue(opt.value)}
                  className={cn(
                    "font-mono text-[9px] tracking-wider px-2 py-1 transition-colors",
                    queue === opt.value
                      ? "text-[var(--color-accent-text)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {matchesQuery.isLoading ? (
            <PageLoader message="Loading matches..." />
          ) : matches.length === 0 ? (
            !isIngesting ? (
              <Card>
                <CardContent className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                  No matches found.
                </CardContent>
              </Card>
            ) : null
          ) : (
            <div className="overflow-hidden rounded-sm bg-[var(--color-surface)]">
              <MatchListHeader className="border-b border-[var(--color-border)]" />
              {matches.slice(0, 20).map((match: MatchSummary) => (
                <MatchRow
                  key={match.match_id}
                  match={match}
                  expanded={expandedMatchId === match.match_id}
                  onToggle={() => setExpandedMatchId(expandedMatchId === match.match_id ? null : match.match_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
