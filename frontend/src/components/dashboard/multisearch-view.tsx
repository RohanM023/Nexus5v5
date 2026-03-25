"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { cn, getProfileIconUrl, getChampionIconUrl, formatWinRate, formatKDARatio } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import type { PublicSummonerProfile, PerformanceStats, RankedDataResponse, ChampionPoolResponse, RankedEntry } from "@/types";

const REGIONS = [
  { value: "na1", label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
];

interface PlayerResult {
  summoner: PublicSummonerProfile;
  performance: PerformanceStats | null;
  ranked: RankedDataResponse | null;
  championPool: ChampionPoolResponse | null;
}

function getEmblemUrl(tier: string): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.png`;
}

export function MultisearchView() {
  const [input, setInput] = useState("");
  const [region, setRegion] = useState("na1");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<(PlayerResult | { error: string; name: string })[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const parseNames = (text: string): { gameName: string; tagLine: string; raw: string }[] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((line) => {
        const parts = line.split("#");
        if (parts.length === 2 && parts[0] && parts[1]) {
          return { gameName: parts[0].trim(), tagLine: parts[1].trim(), raw: line };
        }
        return { gameName: "", tagLine: "", raw: line };
      });
  };

  const parsed = parseNames(input);
  const validCount = parsed.filter((p) => p.gameName && p.tagLine).length;
  const hasInvalid = parsed.some((p) => !p.gameName || !p.tagLine);

  const handleScout = async () => {
    const names = parsed.filter((p) => p.gameName && p.tagLine);
    if (names.length === 0) return;

    setLoading(true);
    setResults([]);
    setHasSearched(true);

    // Step 1: Look up all summoners in parallel
    const lookupResults = await Promise.allSettled(
      names.map((n) => api.lookupSummoner(region, n.gameName, n.tagLine))
    );

    // Step 2: For each resolved player, fetch stats in parallel
    const playerResults = await Promise.allSettled(
      lookupResults.map(async (result, i) => {
        if (result.status === "rejected") {
          return { error: result.reason?.message || "Not found", name: names[i].raw } as { error: string; name: string };
        }

        const summoner = result.value;
        const [perfResult, rankedResult, poolResult] = await Promise.allSettled([
          api.getSummonerPerformance(summoner.puuid),
          api.getRankedData(region, summoner.game_name, summoner.tag_line),
          api.getSummonerChampionPool(summoner.puuid),
        ]);

        return {
          summoner,
          performance: perfResult.status === "fulfilled" ? perfResult.value : null,
          ranked: rankedResult.status === "fulfilled" ? rankedResult.value : null,
          championPool: poolResult.status === "fulfilled" ? poolResult.value : null,
        } as PlayerResult;
      })
    );

    setResults(
      playerResults.map((r) =>
        r.status === "fulfilled" ? r.value : { error: "Lookup failed", name: "Unknown" }
      )
    );
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Input area */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="font-mono text-[10px] font-medium tracking-wider uppercase text-[var(--color-text-secondary)]">
                Summoner Names
              </label>
              <div className="flex gap-2">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-8 self-start rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-mono text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={"Player1#NA1\nPlayer2#TAG\nPlayer3#EUW\nPlayer4#KR1\nPlayer5#BR1"}
                  rows={5}
                  className="flex-1 resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>
              {hasInvalid && parsed.length > 0 && (
                <p className="font-mono text-[9px] text-[var(--color-danger)]">
                  Each line must be in GameName#TAG format
                </p>
              )}
            </div>
            <Button
              onClick={handleScout}
              disabled={validCount === 0 || loading}
              isLoading={loading}
              size="sm"
              className="shrink-0 self-end"
            >
              Scout {validCount > 0 && `(${validCount})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
              Scouting {validCount} players...
            </span>
          </div>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {results.map((result, i) => {
            if ("error" in result) {
              return <FailedCard key={i} name={result.name} error={result.error} />;
            }
            return <PlayerCard key={result.summoner.puuid} data={result} />;
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <p className="font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            Paste up to 5 summoner names from champ select to scout your lobby
          </p>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ data }: { data: PlayerResult }) {
  const { summoner, performance, ranked, championPool } = data;
  const soloEntry = ranked?.entries.find((e: RankedEntry) => e.queue_type === "RANKED_SOLO_5x5");
  const topChamps = championPool?.champions.slice(0, 3) ?? [];

  const winRate = soloEntry
    ? soloEntry.wins + soloEntry.losses > 0
      ? ((soloEntry.wins / (soloEntry.wins + soloEntry.losses)) * 100).toFixed(1)
      : "0.0"
    : null;
  const winRateNum = winRate ? parseFloat(winRate) : 0;
  const totalGames = soloEntry ? soloEntry.wins + soloEntry.losses : 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {/* Header: icon + name */}
        <div className="flex items-center gap-2">
          <Image
            src={getProfileIconUrl(summoner.profile_icon_id)}
            alt="Icon"
            width={28}
            height={28}
            className="shrink-0 rounded-sm"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs font-medium text-[var(--color-text-primary)]">
              {summoner.game_name}
              <span className="text-[var(--color-text-muted)]">#{summoner.tag_line}</span>
            </p>
          </div>
        </div>

        {/* Ranked */}
        {soloEntry ? (
          <div className="flex items-center gap-2">
            <Image
              src={getEmblemUrl(soloEntry.tier)}
              alt={soloEntry.tier}
              width={24}
              height={24}
              className="shrink-0"
              unoptimized
            />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold text-[var(--color-text-primary)]">
                {soloEntry.tier} {soloEntry.rank}
                <span className="ml-1 text-[var(--color-accent-text)]">{soloEntry.league_points} LP</span>
              </p>
              <div className="flex items-center gap-2 font-mono text-[9px]">
                <span
                  className="font-medium"
                  style={{ color: winRateNum >= 50 ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  {winRate}%
                </span>
                <span className="text-[var(--color-text-muted)]">{totalGames}G</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="font-mono text-[9px] text-[var(--color-text-muted)]">Unranked</p>
        )}

        {/* KDA */}
        {performance && performance.total_games > 0 && (
          <div className="font-mono text-[9px] text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-primary)]">
              {formatKDARatio(performance.avg_kills, performance.avg_deaths, performance.avg_assists)}
            </span>
            {" "}KDA
            <span className="ml-1.5 text-[var(--color-text-muted)]">
              ({formatWinRate(performance.overall_win_rate)} WR)
            </span>
          </div>
        )}

        {/* Top 3 Champions */}
        {topChamps.length > 0 && (
          <div className="flex items-center gap-1.5">
            {topChamps.map((champ) => (
              <div key={champ.champion_id} className="flex items-center gap-1" title={`${champ.champion_name} — ${champ.games_played}G`}>
                <Image
                  src={getChampionIconUrl(champ.champion_name)}
                  alt={champ.champion_name}
                  width={20}
                  height={20}
                  className="rounded"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {/* Primary role */}
        {performance?.role_distribution?.[0] && (
          <span className="inline-block rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-[var(--color-accent-text)]">
            {performance.role_distribution[0].role}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function FailedCard({ name, error }: { name: string; error: string }) {
  return (
    <Card className="opacity-50">
      <CardContent className="flex flex-col items-center justify-center gap-2 p-4 py-8">
        <p className="truncate font-mono text-xs text-[var(--color-text-muted)]">{name}</p>
        <p className="font-mono text-[9px] text-[var(--color-danger)]">{error}</p>
      </CardContent>
    </Card>
  );
}
