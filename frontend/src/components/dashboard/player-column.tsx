"use client";

import Image from "next/image";
import { cn, getChampionIconUrl } from "@/lib/utils";
import type { TeamPlayer, TeamRole } from "@/types";

interface PlayerColumnProps {
  player: TeamPlayer | null;
  role: TeamRole;
  side: "your" | "opponent";
}

const ROLE_LABELS: Record<TeamRole, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MID: "Mid",
  BOT: "Bot",
  SUPPORT: "Supp",
};

export function PlayerColumn({ player, role, side }: PlayerColumnProps) {
  return (
    <div className="flex min-w-[120px] flex-col items-center gap-2">
      {/* Role label */}
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {ROLE_LABELS[role]}
      </span>

      {/* Champion portrait */}
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2",
          player?.selected_champion
            ? side === "your"
              ? "border-teal-500/60 bg-teal-500/10"
              : "border-red-500/60 bg-red-500/10"
            : "border-slate-700 bg-slate-800/50"
        )}
      >
        {player?.selected_champion ? (
          <Image
            src={getChampionIconUrl(player.selected_champion.name)}
            alt={player.selected_champion.name}
            width={72}
            height={72}
            className="rounded-lg"
            unoptimized
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-600">
            <span className="text-lg text-slate-600">?</span>
          </div>
        )}
      </div>

      {/* Player name */}
      {player ? (
        <p className="max-w-[120px] truncate text-center text-xs font-medium text-white">
          {player.game_name}
        </p>
      ) : (
        <p className="text-xs text-slate-600">Empty</p>
      )}

      {/* Alt accounts linked */}
      {player && player.alt_accounts.length > 0 && (
        <div className="flex flex-col items-center gap-0.5">
          {player.alt_accounts.map((alt, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              {alt.game_name}
            </span>
          ))}
        </div>
      )}

      {/* True Mastery champions */}
      {player && player.top_champions.length > 0 && (
        <div className="mt-1 w-full space-y-1">
          <p className="text-center text-[9px] font-bold uppercase tracking-wider text-teal-400">
            True Mastery
          </p>
          {player.top_champions.slice(0, 3).map((champ) => (
            <div
              key={champ.champion_id}
              className="flex items-center gap-1.5 rounded-md bg-slate-800/60 px-1.5 py-1"
            >
              <Image
                src={getChampionIconUrl(champ.champion_name)}
                alt={champ.champion_name}
                width={20}
                height={20}
                className="rounded"
                unoptimized
              />
              <span className="flex-1 truncate text-[10px] text-slate-400">
                {champ.champion_name}
              </span>
              <span className="text-[10px] font-semibold text-teal-400">
                {Math.round(champ.true_mastery)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
