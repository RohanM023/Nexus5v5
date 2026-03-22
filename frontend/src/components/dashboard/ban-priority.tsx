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
      <div className="rounded-md bg-[var(--color-surface)] p-4">
        <p className="font-mono text-xs tracking-wider uppercase text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Add opponent players to see ban recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-[var(--color-surface)] p-4">
      <p className="mb-3 font-mono text-xs tracking-wider uppercase text-[var(--color-danger)]/80">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {bans.slice(0, 10).map((ban) => (
          <div
            key={ban.champion_id}
            className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded transition-opacity hover:opacity-80"
          >
            <Image
              src={getChampionIconUrl(ban.champion_name)}
              alt={ban.champion_name}
              width={40}
              height={40}
              className="rounded"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-0.5 py-0.5">
              <span className="block truncate text-center font-mono text-[10px] font-medium text-white">
                {Math.round(ban.comfort_score)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
