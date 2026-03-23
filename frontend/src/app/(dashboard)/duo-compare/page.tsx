"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { cn, getChampionIconUrl, getTierBgColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VennDiagram } from "@/components/charts/venn-diagram";
import type { DuoOverlapResponse, SharedChampion, ChampionPoolEntry } from "@/types";

const REGIONS = [
  { value: "na1", label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
];

interface PlayerInput {
  riotId: string;
  region: string;
}

export default function DuoComparePage() {
  const [player1, setPlayer1] = useState<PlayerInput>({ riotId: "", region: "na1" });
  const [player2, setPlayer2] = useState<PlayerInput>({ riotId: "", region: "na1" });
  const [result, setResult] = useState<DuoOverlapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseRiotId = (input: string): { gameName: string; tagLine: string } | null => {
    const parts = input.trim().split("#");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { gameName: parts[0], tagLine: parts[1] };
  };

  const canCompare =
    parseRiotId(player1.riotId) !== null && parseRiotId(player2.riotId) !== null;

  const handleCompare = async () => {
    const p1 = parseRiotId(player1.riotId);
    const p2 = parseRiotId(player2.riotId);
    if (!p1 || !p2) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const [summoner1, summoner2] = await Promise.all([
        api.lookupSummoner(player1.region, p1.gameName, p1.tagLine),
        api.lookupSummoner(player2.region, p2.gameName, p2.tagLine),
      ]);

      const overlap = await api.getDuoOverlap(summoner1.puuid, summoner2.puuid);
      setResult(overlap);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to compare players"
      );
    } finally {
      setLoading(false);
    }
  };

  const p1Label = player1.riotId.split("#")[0] || "Player 1";
  const p2Label = player2.riotId.split("#")[0] || "Player 2";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
          Duo Compare
        </h1>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Compare champion pools between two players to find overlap and synergy.
        </p>
      </div>

      {/* Search Inputs */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Player 1 */}
            <div className="flex-1 space-y-1.5">
              <label className="font-mono text-[10px] font-medium tracking-wider uppercase text-[var(--color-team-blue)]">
                Player 1
              </label>
              <div className="flex gap-2">
                <select
                  value={player1.region}
                  onChange={(e) => setPlayer1({ ...player1, region: e.target.value })}
                  className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-mono text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Name#TAG"
                  value={player1.riotId}
                  onChange={(e) => setPlayer1({ ...player1, riotId: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && canCompare && handleCompare()}
                  className="h-8 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>
            </div>

            {/* VS divider */}
            <div className="hidden items-center pb-0.5 sm:flex">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--color-text-muted)]">
                VS
              </span>
            </div>

            {/* Player 2 */}
            <div className="flex-1 space-y-1.5">
              <label className="font-mono text-[10px] font-medium tracking-wider uppercase text-[var(--color-team-red)]">
                Player 2
              </label>
              <div className="flex gap-2">
                <select
                  value={player2.region}
                  onChange={(e) => setPlayer2({ ...player2, region: e.target.value })}
                  className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-mono text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Name#TAG"
                  value={player2.riotId}
                  onChange={(e) => setPlayer2({ ...player2, riotId: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && canCompare && handleCompare()}
                  className="h-8 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>
            </div>

            {/* Compare button */}
            <Button
              onClick={handleCompare}
              disabled={!canCompare || loading}
              isLoading={loading}
              size="sm"
              className="shrink-0"
            >
              Compare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="border-l-2 border-[var(--color-danger)] bg-[var(--color-danger)]/5 px-4 py-2 font-mono text-xs text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-5 w-5 animate-spin text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
              Comparing pools...
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Venn Diagram */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Overlap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-sm">
                <VennDiagram
                  leftCount={result.player1_exclusive_count}
                  rightCount={result.player2_exclusive_count}
                  overlapCount={result.shared_count}
                  leftLabel={p1Label}
                  rightLabel={p2Label}
                  overlapPercentage={Math.round(result.overlap_percentage)}
                />
              </div>
              <div className="mt-4 flex justify-center gap-8 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
                <span>
                  <span className="text-[var(--color-team-blue)]">{p1Label}</span>{" "}
                  {result.player1_total} champs
                </span>
                <span>
                  <span className="text-[var(--color-team-red)]">{p2Label}</span>{" "}
                  {result.player2_total} champs
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shared Champions */}
          {result.shared_champions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shared Champions</CardTitle>
                  <span className="rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-accent-text)]">
                    {result.shared_count}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 px-2 pb-2 font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                    <span>Champion</span>
                    <span className="text-center text-[var(--color-team-blue)]">P1 Tier</span>
                    <span className="text-center text-[var(--color-team-red)]">P2 Tier</span>
                    <span className="text-center">P1 Mastery</span>
                    <span className="text-center">P2 Mastery</span>
                  </div>

                  {result.shared_champions
                    .sort((a: SharedChampion, b: SharedChampion) => b.avg_mastery - a.avg_mastery)
                    .map((champ: SharedChampion) => (
                      <div
                        key={champ.champion_id}
                        className="grid grid-cols-[1fr_60px_60px_60px_60px] items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Image
                            src={getChampionIconUrl(champ.champion_name)}
                            alt={champ.champion_name}
                            width={24}
                            height={24}
                            unoptimized
                            className="shrink-0 rounded"
                          />
                          <span className="truncate font-mono text-xs text-[var(--color-text-primary)]">
                            {champ.champion_name}
                          </span>
                        </div>

                        <div className="flex justify-center">
                          <TierBadge tier={champ.player1_tier} />
                        </div>
                        <div className="flex justify-center">
                          <TierBadge tier={champ.player2_tier} />
                        </div>

                        <span className="text-center font-mono text-[10px] text-[var(--color-text-secondary)]">
                          {champ.player1_mastery.toFixed(0)}
                        </span>
                        <span className="text-center font-mono text-[10px] text-[var(--color-text-secondary)]">
                          {champ.player2_mastery.toFixed(0)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exclusive Champions */}
          <div className="grid gap-6 sm:grid-cols-2">
            <ExclusiveColumn
              label={p1Label}
              champions={result.player1_exclusive}
              color="var(--color-team-blue)"
            />
            <ExclusiveColumn
              label={p2Label}
              champions={result.player2_exclusive}
              color="var(--color-team-red)"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const normalized = tier.toUpperCase() as "S" | "A" | "B" | "C";
  if (!["S", "A", "B", "C"].includes(normalized)) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] font-mono text-[9px] font-bold text-[var(--color-text-muted)]">
        {tier}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded border font-mono text-[9px] font-bold",
        getTierBgColor(normalized)
      )}
    >
      {normalized}
    </span>
  );
}

function ExclusiveColumn({
  label,
  champions,
  color,
}: {
  label: string;
  champions: ChampionPoolEntry[];
  color: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <CardTitle>{label} Only</CardTitle>
          <span className="ml-auto rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
            {champions.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {champions.length === 0 ? (
          <p className="py-4 text-center font-mono text-[10px] text-[var(--color-text-muted)]">
            No exclusive champions
          </p>
        ) : (
          <div className="space-y-1">
            {champions.map((champ: ChampionPoolEntry) => (
              <div
                key={champ.champion_id}
                className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <Image
                  src={getChampionIconUrl(champ.champion_name)}
                  alt={champ.champion_name}
                  width={20}
                  height={20}
                  unoptimized
                  className="shrink-0 rounded"
                />
                <span className="flex-1 truncate font-mono text-xs text-[var(--color-text-primary)]">
                  {champ.champion_name}
                </span>
                <TierBadge tier={champ.tier} />
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                  {champ.true_mastery.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
