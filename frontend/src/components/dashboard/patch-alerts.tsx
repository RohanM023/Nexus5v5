"use client";

import Image from "next/image";
import { getChampionIconUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ChampionPoolResponse } from "@/types";

interface PatchChange {
  champion: string;
  type: "buff" | "nerf" | "adjust";
  summary: string;
  impact: "High" | "Med" | "Low";
}

// Patch 25.8 changes — update each patch cycle
const PATCH = "25.8";
const PATCH_CHANGES: PatchChange[] = [
  { champion: "Jinx", type: "buff", summary: "Q damage increased, W missile speed up", impact: "High" },
  { champion: "Zac", type: "nerf", summary: "E max charges reduced from 4 to 3", impact: "High" },
  { champion: "Orianna", type: "buff", summary: "Base mana regen increased, Q cooldown reduced", impact: "Med" },
  { champion: "Yasuo", type: "nerf", summary: "Passive shield generation reduced", impact: "Med" },
  { champion: "Thresh", type: "adjust", summary: "Q hook width narrowed, passive soul scaling improved", impact: "Med" },
  { champion: "Leona", type: "buff", summary: "W armor scaling up, E cooldown reduced at rank 1", impact: "Med" },
  { champion: "Amumu", type: "nerf", summary: "R cooldown increased at early ranks", impact: "Low" },
  { champion: "Camille", type: "buff", summary: "W heal increased, E damage scaling improved", impact: "Low" },
  { champion: "Caitlyn", type: "nerf", summary: "Headshot damage reduced vs non-trapped targets", impact: "Low" },
  { champion: "Lulu", type: "adjust", summary: "E shield value nerfed, R cooldown reduced", impact: "Med" },
];

const TYPE_CONFIG = {
  buff: { label: "Buff", color: "text-[var(--color-success)]", bg: "bg-[var(--color-success-bg)]" },
  nerf: { label: "Nerf", color: "text-[var(--color-danger)]", bg: "bg-[var(--color-danger)]/10" },
  adjust: { label: "Adjust", color: "text-[var(--color-warning)]", bg: "bg-[var(--color-warning-bg)]" },
};

interface PatchAlertsProps {
  championPool?: ChampionPoolResponse | null;
}

export function PatchAlerts({ championPool }: PatchAlertsProps) {
  const poolNames = new Set(
    (championPool?.champions ?? []).map((c) => c.champion_name.toLowerCase())
  );

  const yourChampChanges = PATCH_CHANGES.filter((c) =>
    poolNames.has(c.champion.toLowerCase())
  );
  const otherChanges = PATCH_CHANGES.filter(
    (c) => !poolNames.has(c.champion.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-[var(--color-text-primary)]">
          Patch {PATCH} Impact
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
              const cfg = TYPE_CONFIG[change.type];
              return (
                <div
                  key={change.champion}
                  className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 last:border-b-0"
                >
                  <Image
                    src={getChampionIconUrl(change.champion)}
                    alt={change.champion}
                    width={28}
                    height={28}
                    className="rounded shrink-0"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{change.champion}</span>
                      <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-medium", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className={cn(
                        "font-mono text-[9px]",
                        change.impact === "High" ? "text-[var(--color-danger)]" :
                        change.impact === "Med" ? "text-[var(--color-warning)]" :
                        "text-[var(--color-text-muted)]"
                      )}>
                        {change.impact} impact
                      </span>
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
            None of your champion pool was touched in patch {PATCH}.
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
          All Changes
        </p>
        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
          {otherChanges.map((change) => {
            const cfg = TYPE_CONFIG[change.type];
            return (
              <div
                key={change.champion}
                className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 last:border-b-0 opacity-70"
              >
                <Image
                  src={getChampionIconUrl(change.champion)}
                  alt={change.champion}
                  width={24}
                  height={24}
                  className="rounded shrink-0"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[var(--color-text-primary)]">{change.champion}</span>
                    <span className={cn("rounded px-1 py-0.5 font-mono text-[9px]", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
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
