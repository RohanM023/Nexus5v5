"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
import {
  cn,
  formatKDA,
  formatDuration,
  formatTimeAgo,
  formatCsPerMin,
  getChampionIconUrl,
} from "@/lib/utils";
import type { MatchSummary } from "@/types";

const QUEUE_OPTIONS = [
  { value: undefined, label: "All Queues" },
  { value: 420, label: "Ranked Solo" },
  { value: 700, label: "Clash" },
] as const;

export default function MatchHistoryPage() {
  const { profile, isAuthenticated } = useAuth();
  const [queue, setQueue] = useState<number | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allMatches, setAllMatches] = useState<MatchSummary[]>([]);

  const primaryAccount = profile?.accounts.find((a) => a.is_primary);
  const puuid = primaryAccount?.puuid;

  const { data, isLoading, error } = useQuery({
    queryKey: ["match-history", puuid, queue, cursor],
    queryFn: async () => {
      const result = await api.getMatchHistory(puuid!, cursor, queue);
      return result;
    },
    enabled: !!puuid,
  });

  const displayMatches =
    cursor && allMatches.length > 0
      ? allMatches
      : data?.data || [];

  const loadMore = useCallback(() => {
    if (data?.pagination.has_more && data.pagination.cursor) {
      setAllMatches((prev) => [...prev, ...(data.data || [])]);
      setCursor(data.pagination.cursor);
    }
  }, [data]);

  const changeQueue = (newQueue: number | undefined) => {
    setQueue(newQueue);
    setCursor(undefined);
    setAllMatches([]);
  };

  if (!isAuthenticated) {
    return <ErrorDisplay message="Please sign in to view match history." />;
  }

  if (!puuid) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorDisplay message="Link a Riot account to see your match history." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Match History</h1>
        <p className="mt-1 text-sm text-slate-400">
          {primaryAccount?.game_name}#{primaryAccount?.tag_line}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {QUEUE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => changeQueue(opt.value)}
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

      {isLoading && allMatches.length === 0 ? (
        <PageLoader message="Loading matches..." />
      ) : error ? (
        <ErrorDisplay message="Failed to load match history." />
      ) : displayMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No matches found for this filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayMatches.map((match) => (
            <MatchRow key={match.match_id} match={match} />
          ))}

          {data?.pagination.has_more && (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                onClick={loadMore}
                isLoading={isLoading}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchRow({ match }: { match: MatchSummary }) {
  return (
    <Card
      className={cn(
        "transition-colors hover:border-slate-700",
        match.win ? "border-l-2 border-l-green-500" : "border-l-2 border-l-red-500"
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
