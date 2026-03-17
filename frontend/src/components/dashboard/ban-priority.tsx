"use client";

import Image from "next/image";
import { getChampionIconUrl } from "@/lib/utils";

interface BanTarget {
  champion_id: number;
  champion_name: string;
  comfort_score: number;
}

interface BanPriorityProps {
  bans: BanTarget[];
  label?: string;
}

export function BanPriority({
  bans,
  label = "Ban Priority",
}: BanPriorityProps) {
  if (bans.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Add opponent players to see ban recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-400">
        {label}
      </p>
      <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
        Opponent Champion Pools
      </p>
      <div className="flex flex-wrap gap-2">
        {bans.slice(0, 10).map((ban) => (
          <div
            key={ban.champion_id}
            className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-red-500/30 bg-red-500/10 transition-colors hover:border-red-400/50"
          >
            <Image
              src={getChampionIconUrl(ban.champion_name)}
              alt={ban.champion_name}
              width={44}
              height={44}
              className="rounded"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-0.5 py-0.5">
              <span className="block truncate text-center text-[8px] font-medium text-white">
                {Math.round(ban.comfort_score)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
