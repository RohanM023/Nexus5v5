"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { StatsOverview } from "@/components/profile/stats-overview";
import { ChampionPoolGrid } from "@/components/profile/champion-pool-grid";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
import { cn, formatKDA, formatDuration, formatTimeAgo, formatCsPerMin, getChampionIconUrl } from "@/lib/utils";
import type { MatchSummary } from "@/types";
import Image from "next/image";
import Link from "next/link";

const QUEUE_OPTIONS = [
  { value: undefined, label: "All Queues" },
  { value: 420, label: "Ranked Solo" },
  { value: 700, label: "Clash" },
] as const;

export default function SummonerPage() {
  const params = useParams();
  const region = params.region as string;
  const gameName = decodeURIComponent(params.gameName as string);
  const tagLine = decodeURIComponent(params.tagLine as string);

  const [queue, setQueue] = useState<number | undefined>(undefined);

  const summonerQuery = useQuery({
    queryKey: ["summoner", region, gameName, tagLine],
    queryFn: () => api.lookupSummoner(region, gameName, tagLine),
  });

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

  const handleRefreshData = async () => {
    if (summonerQuery.data?.puuid) {
      try {
        await api.triggerIngestion(summonerQuery.data.puuid);
        alert("Match data refresh triggered. This may take a moment.");
        matchesQuery.refetch();
        performanceQuery.refetch();
        championPoolQuery.refetch();
      } catch (error) {
        alert("Failed to trigger data refresh.");
      }
    }
  };

  if (summonerQuery.isLoading) {
    return <PageLoader message={`Looking up ${gameName}#${tagLine}...`} />;
  }

  if (summonerQuery.error) {
    return (
      <div className="mx-auto max-w-7xl">
        <ErrorDisplay
          message={`Could not find summoner "${gameName}#${tagLine}" in ${region.toUpperCase()}.`}
          onRetry={() => summonerQuery.refetch()}
        />
        <div className="mt-4 text-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {summoner.game_name}
            <span className="text-slate-500">#{summoner.tag_line}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {region.toUpperCase()} • Level {summoner.summoner_level}
          </p>
        </div>
        <Button onClick={handleRefreshData} variant="secondary">
          Refresh Data
        </Button>
      </div>

      {/* Stats Overview */}
      {performanceQuery.isLoading ? (
        <PageLoader message="Loading stats..." />
      ) : performance ? (
        <StatsOverview stats={performance} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No performance data available yet.
          </CardContent>
        </Card>
      )}

      {/* Champion Pool */}
      {championPoolQuery.isLoading ? (
        <PageLoader message="Loading champion pool..." />
      ) : championPool && championPool.champions.length > 0 ? (
        <ChampionPoolGrid champions={championPool.champions} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No champion data available yet.
          </CardContent>
        </Card>
      )}

      {/* Recent Matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent Matches</h2>
          <div className="flex gap-2">
            {QUEUE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setQueue(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  queue === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
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
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              No matches found. Try refreshing data or changing the queue filter.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.slice(0, 20).map((match) => (
              <MatchRow key={match.match_id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: MatchSummary }) {
  return (
    <Card
      className={cn(
        "transition-colors hover:border-slate-700",
        match.win
          ? "border-l-2 border-l-green-500"
          : "border-l-2 border-l-red-500"
      )}
    >
      <CardContent className="flex items-center gap-4 py-3">
        <Image
          src={getChampionIconUrl(match.champion_name)}
          alt={match.champion_name}
          width={48}
          height={48}
          className="rounded-lg"
          unoptimized
        />

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {match.champion_name}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-medium",
                match.win
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              )}
            >
              {match.win ? "Victory" : "Defeat"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {match.role} &middot; {formatDuration(match.game_duration)}{" "}
            &middot; {formatTimeAgo(match.game_start)}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-white">
            {formatKDA(match.kills, match.deaths, match.assists)}
          </p>
          <p className="text-xs text-slate-500">KDA</p>
        </div>

        <div className="hidden text-center sm:block">
          <p className="text-sm font-medium text-white">
            {formatCsPerMin(match.cs, match.game_duration)}
          </p>
          <p className="text-xs text-slate-500">CS/min</p>
        </div>

        <div className="hidden text-center sm:block">
          <p className="text-sm font-medium text-white">
            {match.gold_earned.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Gold</p>
        </div>

        <div className="hidden text-center md:block">
          <p className="text-sm font-medium text-white">
            {match.vision_score}
          </p>
          <p className="text-xs text-slate-500">Vision</p>
        </div>
      </CardContent>
    </Card>
  );
}
