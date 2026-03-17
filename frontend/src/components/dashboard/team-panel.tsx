"use client";

import { PlayerColumn } from "./player-column";
import type { TeamPlayer, TeamRole } from "@/types";

interface TeamPanelProps {
  players: (TeamPlayer | null)[];
  side: "your" | "opponent";
  label: string;
}

const ROLES: TeamRole[] = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];

export function TeamPanel({ players, side, label }: TeamPanelProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-center text-lg font-bold uppercase tracking-wider text-white">
        {label}
      </h2>
      <div className="flex justify-center gap-2">
        {ROLES.map((role, idx) => (
          <PlayerColumn
            key={role}
            player={players[idx] || null}
            role={role}
            side={side}
          />
        ))}
      </div>
    </div>
  );
}
