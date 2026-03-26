"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { RankedEntry } from "@/types";

interface RankedCardProps {
  entries: RankedEntry[];
}

export function getEmblemUrl(tier: string): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.png`;
}

export function formatRank(tier: string, rank: string): string {
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier.toUpperCase())) {
    return tier;
  }
  return `${tier} ${rank}`;
}

function QueueCard({ entry, label }: { entry: RankedEntry; label: string }) {
  const winRate = entry.wins + entry.losses > 0
    ? ((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(1)
    : "0.0";
  const winRateNum = parseFloat(winRate);

  return (
    <div className="flex items-center gap-3">
      <Image
        src={getEmblemUrl(entry.tier)}
        alt={entry.tier}
        width={40}
        height={40}
        className="shrink-0"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="font-mono text-xs font-bold tracking-wide text-[var(--color-text-primary)]">
          {formatRank(entry.tier, entry.rank)}
          <span className="ml-1.5 text-[var(--color-accent-text)]">{entry.league_points} LP</span>
          {entry.hot_streak && <span className="ml-1" title="Hot streak">&#x1F525;</span>}
        </p>
      </div>
      <div className="text-right font-mono">
        <p className="text-[10px] text-[var(--color-text-secondary)]">
          {entry.wins}W {entry.losses}L
        </p>
        <p
          className="text-[10px] font-medium"
          style={{ color: winRateNum >= 50 ? "var(--color-success)" : "var(--color-danger)" }}
        >
          {winRate}%
        </p>
      </div>
    </div>
  );
}

export function RankedCard({ entries }: RankedCardProps) {
  const solo = entries.find((e) => e.queue_type === "RANKED_SOLO_5x5");
  const flex = entries.find((e) => e.queue_type === "RANKED_FLEX_SR");

  if (!solo && !flex) {
    return (
      <Card>
        <CardContent className="py-4 text-center font-mono text-[10px] text-[var(--color-text-muted)]">
          Unranked
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3 space-y-3">
        {solo && <QueueCard entry={solo} label="Solo/Duo" />}
        {flex && <QueueCard entry={flex} label="Flex" />}
      </CardContent>
    </Card>
  );
}
