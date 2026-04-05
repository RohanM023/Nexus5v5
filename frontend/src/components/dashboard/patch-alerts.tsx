"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { getChampionIconUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ChampionPoolResponse } from "@/types";

const TYPE_CONFIG = {
  buff: { label: "Buff", color: "text-[var(--color-success)]", bg: "bg-[var(--color-success-bg)]" },
  nerf: { label: "Nerf", color: "text-[var(--color-danger)]", bg: "bg-[var(--color-danger)]/10" },
  adjust: { label: "Adjust", color: "text-[var(--color-warning)]", bg: "bg-[var(--color-warning-bg)]" },
};

interface PatchAlertsProps {
  championPool?: ChampionPoolResponse | null;
}

export function PatchAlerts({ championPool }: PatchAlertsProps) {
  const { data: patchData, isLoading } = useQuery({
    queryKey: ["patch-data"],
    queryFn: () => api.getPatchData(),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading || !patchData) return null;

  const poolNames = new Set(
    (championPool?.champions ?? []).map((c) => c.champion_name.toLowerCase())
  );

  const yourChampChanges = patchData.changes.filter((c) =>
    poolNames.has(c.champion.toLowerCase())
  );
  const otherChanges = patchData.changes.filter(
    (c) => !poolNames.has(c.champion.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-[var(--color-text-primary)]">
          Patch {patchData.patch} Impact
        </h3>
        {yourChampChanges.length > 0 && (
          <span className="rounded bg-[var(--color-accent)]/10 px-2 py-0.5 font-mono text-[9px] text-[var(--color-accent-text)]">
            {yourChampChanges.length} affecting your pool
          </span>
        )}
      </div>

      {yourChampChanges.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
            Your Champions
          </p>
          <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
            {yourChampChanges.map((change) => {
              const cfg = TYPE_CONFIG[change.type] ?? TYPE_CONFIG.adjust;
              return (
                <div key={change.champion}
                  className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 last:border-b-0">
                  <Image src={getChampionIconUrl(change.champion)} alt={change.champion}
                    width={28} height={28} className="rounded shrink-0" unoptimized />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{change.champion}</span>
                      <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-medium", cfg.bg, cfg.color)}>{cfg.label}</span>
                      <span className={cn("font-mono text-[9px]",
                        change.impact === "High" ? "text-[var(--color-danger)]" :
                        change.impact === "Med" ? "text-[var(--color-warning)]" :
                        "text-[var(--color-text-muted)]"
                      )}>{change.impact} impact</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{change.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {yourChampChanges.length === 0 && poolNames.size > 0 && (
        <div className="rounded-md border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] px-4 py-2.5">
          <p className="text-[10px] text-[var(--color-success)]">
            None of your champion pool was touched in patch {patchData.patch}.
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">All Changes</p>
        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
          {otherChanges.map((change) => {
            const cfg = TYPE_CONFIG[change.type] ?? TYPE_CONFIG.adjust;
            return (
              <div key={change.champion}
                className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 last:border-b-0 opacity-70">
                <Image src={getChampionIconUrl(change.champion)} alt={change.champion}
                  width={24} height={24} className="rounded shrink-0" unoptimized />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[var(--color-text-primary)]">{change.champion}</span>
                    <span className={cn("rounded px-1 py-0.5 font-mono text-[9px]", cfg.bg, cfg.color)}>{cfg.label}</span>
                  </div>
                  <p className="text-[9px] text-[var(--color-text-muted)]">{change.summary}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
