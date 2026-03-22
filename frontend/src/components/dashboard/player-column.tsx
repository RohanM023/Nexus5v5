"use client";

import Image from "next/image";
import { cn, getChampionIconUrl } from "@/lib/utils";
import type { ChampionPoolEntry, TeamPlayer, TeamRole } from "@/types";

interface PlayerColumnProps {
  player: TeamPlayer | null;
  role: TeamRole;
  side: "your" | "opponent";
  championPool?: ChampionPoolEntry[] | null;
  poolLoading?: boolean;
  onPickChampion?: () => void;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  TOP: "Top",
  JUNGLE: "Jgl",
  MID: "Mid",
  BOT: "Bot",
  SUPPORT: "Sup",
};

export function PlayerColumn({
  player,
  role,
  side,
  championPool,
  poolLoading,
  onPickChampion,
}: PlayerColumnProps) {
  const topChamps = championPool?.slice(0, 3) ?? player?.top_champions ?? [];

  return (
    <div className="flex min-w-[100px] flex-col items-center gap-2">
      <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
        {ROLE_LABELS[role]}
      </span>

      <button
        type="button"
        onClick={player && onPickChampion ? onPickChampion : undefined}
        disabled={!player || !onPickChampion}
        className={cn(
          "flex h-16 w-16 items-center justify-center overflow-hidden rounded-md transition-all",
          player?.selected_champion
            ? side === "your"
              ? "ring-1 ring-amber-600/50 bg-amber-600/5"
              : "ring-1 ring-red-500/50 bg-red-500/5"
            : "bg-[var(--color-surface)]",
          player && onPickChampion && "cursor-pointer hover:ring-1 hover:ring-amber-500/40"
        )}
      >
        {player?.selected_champion ? (
          <Image
            src={getChampionIconUrl(player.selected_champion.name)}
            alt={player.selected_champion.name}
            width={56}
            height={56}
            className="rounded"
            unoptimized
          />
        ) : (
          <span className="font-mono text-sm text-[var(--color-text-muted)]">?</span>
        )}
      </button>

      {player ? (
        <p className="max-w-[100px] truncate text-center text-[10px] font-medium text-white">
          {player.game_name}
        </p>
      ) : (
        <p className="text-[10px] text-[var(--color-text-muted)]">—</p>
      )}

      {player && player.alt_accounts.length > 0 && (
        <div className="flex flex-col items-center gap-0.5">
          {player.alt_accounts.map((alt, i) => (
            <span key={i} className="flex items-center gap-1 font-mono text-[8px] text-[var(--color-text-muted)]">
              <span className="h-1 w-1 rounded-full bg-amber-600/50" />
              {alt.game_name}
            </span>
          ))}
        </div>
      )}

      {player && poolLoading && (
        <div className="mt-1 w-full space-y-1">
          <p className="text-center font-mono text-[8px] tracking-wider uppercase text-amber-600/60">
            Mastery
          </p>
          <p className="text-center text-[9px] text-[var(--color-text-muted)]">Loading...</p>
        </div>
      )}
      {player && !poolLoading && topChamps.length > 0 && (
        <div className="mt-1 w-full space-y-0.5">
          <p className="text-center font-mono text-[8px] tracking-wider uppercase text-amber-600/60">
            Mastery
          </p>
          {topChamps.slice(0, 3).map((champ) => (
            <div
              key={champ.champion_id}
              className="flex items-center gap-1 rounded px-1 py-0.5"
            >
              <Image
                src={getChampionIconUrl(champ.champion_name)}
                alt={champ.champion_name}
                width={16}
                height={16}
                className="rounded-sm"
                unoptimized
              />
              <span className="flex-1 truncate text-[9px] text-[var(--color-text-muted)]">
                {champ.champion_name}
              </span>
              <span className="font-mono text-[9px] font-medium text-amber-500">
                {Math.round(champ.true_mastery)}
              </span>
            </div>
          ))}
        </div>
      )}
      {player && !poolLoading && topChamps.length === 0 && (
        <div className="mt-1 w-full">
          <p className="text-center font-mono text-[8px] tracking-wider uppercase text-amber-600/60">
            Mastery
          </p>
          <p className="text-center text-[9px] text-[var(--color-text-muted)]">—</p>
        </div>
      )}
    </div>
  );
}
