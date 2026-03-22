"use client";

import { PlayerColumn } from "./player-column";
import type { ChampionPoolResponse, TeamPlayer, TeamRole } from "@/types";

interface TeamPanelProps {
  players: (TeamPlayer | null)[];
  side: "your" | "opponent";
  label: string;
  pools?: (ChampionPoolResponse | null)[];
  poolsLoading?: boolean;
  onPickChampion?: (role: TeamRole) => void;
}

const ROLES: TeamRole[] = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];

export function TeamPanel({
  players,
  side,
  label,
  pools,
  poolsLoading,
  onPickChampion,
}: TeamPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-center font-mono text-[9px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">
        {label}
      </h2>
      <div className="flex justify-center gap-1">
        {ROLES.map((role, idx) => {
          const pool = pools?.[idx]?.champions;
          return (
            <PlayerColumn
              key={role}
              player={players[idx] || null}
              role={role}
              side={side}
              championPool={pool}
              poolLoading={poolsLoading}
              onPickChampion={
                onPickChampion && players[idx]
                  ? () => onPickChampion(role)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
