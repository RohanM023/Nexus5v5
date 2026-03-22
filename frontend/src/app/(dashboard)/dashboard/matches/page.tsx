"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
import { MatchRow } from "@/components/match/match-row";
import { cn } from "@/lib/utils";

const QUEUE_OPTIONS = [
  { value: undefined, label: "All" },
  { value: 420, label: "Ranked" },
  { value: 700, label: "Clash" },
] as const;

export default function MatchHistoryPage() {
  const { profile, isAuthenticated } = useAuth();
  const [queue, setQueue] = useState<number | undefined>(undefined);
  const [championSearch, setChampionSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const primaryAccount = profile?.accounts.find((a) => a.is_primary);
  const puuid = primaryAccount?.puuid;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "match-history",
      puuid,
      queue,
      championSearch,
      startDate,
      endDate,
    ],
    queryFn: async ({ pageParam }) => {
      return api.getMatchHistory(
        puuid!,
        pageParam ?? undefined,
        queue,
        championSearch || undefined,
        startDate || undefined,
        endDate || undefined
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? lastPage.pagination.cursor : undefined,
    enabled: !!puuid,
  });

  const allMatches = data?.pages.flatMap((page) => page.data) ?? [];

  const changeQueue = (newQueue: number | undefined) => {
    setQueue(newQueue);
  };

  const clearFilters = () => {
    setQueue(undefined);
    setChampionSearch("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    queue !== undefined || championSearch || startDate || endDate;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">Sign in and link your Riot account to see your match history</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Or{" "}
            <Link href="/" className="text-amber-500 hover:text-amber-400">
              search for a summoner
            </Link>
          </p>
          <Link
            href="/login"
            className="rounded-md bg-amber-600 px-5 py-2 text-xs font-medium text-black hover:bg-amber-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
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
        <h1 className="text-lg font-semibold tracking-tight text-white">Match History</h1>
        <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
          {primaryAccount?.game_name}#{primaryAccount?.tag_line}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          {QUEUE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => changeQueue(opt.value)}
              className={cn(
                "px-3 py-1 text-xs font-medium tracking-wide transition-colors",
                queue === opt.value
                  ? "text-amber-500"
                  : "text-[var(--color-text-muted)] hover:text-white"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Champion..."
            value={championSearch}
            onChange={(e) => setChampionSearch(e.target.value)}
            className="w-36 border-b border-[var(--color-border)] bg-transparent px-0 py-1 text-xs text-white placeholder:text-[var(--color-text-muted)] focus:border-amber-600/50 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-b border-[var(--color-border)] bg-transparent px-0 py-1 text-xs text-white focus:border-amber-600/50 focus:outline-none"
            />
            <span className="text-[10px] text-[var(--color-text-muted)]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-b border-[var(--color-border)] bg-transparent px-0 py-1 text-xs text-white focus:border-amber-600/50 focus:outline-none"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] tracking-wider uppercase text-[var(--color-text-muted)] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader message="Loading matches..." />
      ) : error ? (
        <ErrorDisplay
          message="Failed to load match history."
          onRetry={() => refetch()}
        />
      ) : allMatches.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            {hasActiveFilters
              ? "No matches found for these filters."
              : "No matches found."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {allMatches.map((match) => (
            <MatchRow
              key={match.match_id}
              match={match}
              expanded={expandedMatchId === match.match_id}
              onToggle={() => setExpandedMatchId(expandedMatchId === match.match_id ? null : match.match_id)}
            />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-6">
              <Button
                variant="ghost"
                onClick={() => fetchNextPage()}
                isLoading={isFetchingNextPage}
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
