"use client";

import Image from "next/image";
import { getChampionIconUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TeamPlayer, ChampionPoolResponse } from "@/types";

interface BanTarget {
  champion_id: number;
  champion_name: string;
  comfort_score: number;
}

interface ScoutReportProps {
  opponentTeam: (TeamPlayer | null)[];
  opponentPools: (ChampionPoolResponse | null)[];
  banTargets: BanTarget[];
}

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jng",
  MID: "Mid",
  BOT: "Bot",
  SUPPORT: "Sup",
};

function ThreatBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score));
  const color =
    pct >= 80
      ? "bg-[var(--color-danger)]"
      : pct >= 55
        ? "bg-[var(--color-score-mid-bg)]"
        : "bg-[var(--color-success)]";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 rounded-full bg-[var(--color-border)]">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right font-mono text-[9px] text-[var(--color-text-muted)]">{pct}</span>
    </div>
  );
}

export function ScoutReport({ opponentTeam, opponentPools, banTargets }: ScoutReportProps) {
  const players = opponentTeam.filter(Boolean) as TeamPlayer[];

  if (players.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          Add opponent players to generate a scouting report.
        </p>
      </div>
    );
  }

  const priorityBans = banTargets.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Priority Bans */}
      {priorityBans.length > 0 && (
        <div className="rounded-md border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 p-4">
          <p className="mb-3 font-mono text-[9px] font-medium tracking-[0.3em] uppercase text-[var(--color-danger)]/70">
            Priority Bans
          </p>
          <div className="flex flex-wrap gap-3">
            {priorityBans.map((ban, i) => (
              <div key={ban.champion_id} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[var(--color-text-muted)]">#{i + 1}</span>
                <div className="relative h-9 w-9 overflow-hidden rounded">
                  <Image
                    src={getChampionIconUrl(ban.champion_name)}
                    alt={ban.champion_name}
                    width={36}
                    height={36}
                    className="rounded"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--color-text-primary)]">{ban.champion_name}</p>
                  <p className="font-mono text-[9px] text-[var(--color-text-muted)]">
                    Comfort {Math.round(ban.comfort_score)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-player breakdown */}
      <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
        {players.map((player, idx) => {
          const pool = opponentPools[opponentTeam.indexOf(player)];
          const topChamps = pool?.champions.slice(0, 4) ?? player.top_champions?.slice(0, 4) ?? [];
          const highestComfort = pool?.champions[0]?.comfort_score ?? 0;
          const avgWinRate = pool?.champions.slice(0, 5).reduce((a, c) => a + c.win_rate, 0) / Math.min(5, pool?.champions.length ?? 1) ?? 0;

          return (
            <div
              key={player.puuid}
              className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                      {ROLE_LABELS[player.role] ?? player.role}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {player.game_name}
                      <span className="font-normal text-[var(--color-text-muted)]">#{player.tag_line}</span>
                    </span>
                  </div>

                  {topChamps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {"champion_name" in (topChamps[0] ?? {})
                        ? (topChamps as { champion_id: number; champion_name: string; comfort_score?: number; true_mastery?: number }[]).map((c) => (
                            <div key={c.champion_id} className="flex items-center gap-1">
                              <Image
                                src={getChampionIconUrl(c.champion_name)}
                                alt={c.champion_name}
                                width={24}
                                height={24}
                                className="rounded"
                                unoptimized
                              />
                              <span className="font-mono text-[9px] text-[var(--color-text-muted)]">
                                {Math.round((c.comfort_score ?? c.true_mastery ?? 0))}
                              </span>
                            </div>
                          ))
                        : null}
                    </div>
                  )}
                </div>

                <div className="w-28 shrink-0 space-y-1.5">
                  <div>
                    <p className="mb-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">Threat</p>
                    <ThreatBar score={highestComfort} />
                  </div>
                  {pool && (
                    <p className="font-mono text-[9px] text-[var(--color-text-muted)]">
                      WR{" "}
                      <span className={cn("font-medium", avgWinRate >= 0.53 ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]")}>
                        {(avgWinRate * 100).toFixed(0)}%
                      </span>
                      {" · "}
                      {pool.total_champions} champs
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weakness summary */}
      {banTargets.length > 0 && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-2 font-mono text-[9px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">
            Full Ban Priority
          </p>
          <div className="flex flex-wrap gap-1.5">
            {banTargets.slice(0, 15).map((ban, i) => (
              <div
                key={ban.champion_id}
                className="group relative flex h-8 w-8 items-center justify-center overflow-hidden rounded"
                title={`${ban.champion_name} — Comfort ${Math.round(ban.comfort_score)}`}
              >
                <Image
                  src={getChampionIconUrl(ban.champion_name)}
                  alt={ban.champion_name}
                  width={32}
                  height={32}
                  className={cn("rounded", i >= 5 && "opacity-50")}
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
