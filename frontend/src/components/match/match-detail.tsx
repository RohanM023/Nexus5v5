"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { api } from "@/lib/api";
import { cn, formatKDA, getChampionIconUrl, getItemIconUrl } from "@/lib/utils";
import { Spinner } from "@/components/ui/loading";
import type { MatchTeamDetail, MatchParticipant as Participant } from "@/types";

interface MatchDetailProps {
  matchId: string;
}

export function MatchDetail({ matchId }: MatchDetailProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: () => api.getMatchDetail(matchId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-4 text-center font-mono text-[10px] text-[var(--color-text-muted)]">
        Failed to load match details.
      </div>
    );
  }

  return (
    <div className="grid gap-3 bg-[var(--color-surface)] px-3 py-4 md:grid-cols-2">
      <TeamTable team={data.blue_team} side="blue" />
      <TeamTable team={data.red_team} side="red" />
    </div>
  );
}

function TeamTable({ team, side }: { team: MatchTeamDetail; side: "blue" | "red" }) {
  const headerColor = side === "blue" ? "text-[var(--color-team-blue)]" : "text-[var(--color-team-red)]";
  const borderColor = side === "blue" ? "border-[var(--color-team-blue)]/30" : "border-[var(--color-team-red)]/30";
  const label = side === "blue" ? "Blue Side" : "Red Side";

  return (
    <div className={cn("overflow-hidden rounded-sm border", borderColor)}>
      <div className={cn("flex items-center justify-between px-3 py-1.5", borderColor, "border-b bg-[var(--color-surface)]")}>
        <span className={cn("font-mono text-[9px] font-medium tracking-[0.2em] uppercase", headerColor)}>
          {label}
        </span>
        <span className={cn("font-mono text-[9px] tracking-wider", team.win ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
          {team.win ? "VICTORY" : "DEFEAT"}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[minmax(0,1fr)_56px_48px_48px_48px_40px_minmax(0,130px)] gap-0 border-b border-[var(--color-border)] px-2 py-1 font-mono text-[7px] tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
        <span>Champion</span>
        <span className="text-center">KDA</span>
        <span className="text-center">CS/m</span>
        <span className="text-center">Gold</span>
        <span className="text-center">Dmg</span>
        <span className="text-center">Vis</span>
        <span className="text-center">Items</span>
      </div>

      {team.participants.map((p, i) => (
        <ParticipantRow key={i} participant={p} />
      ))}
    </div>
  );
}

function ParticipantRow({ participant: p }: { participant: Participant }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_56px_48px_48px_48px_40px_minmax(0,130px)] items-center gap-0 border-b border-[var(--color-border)] px-2 py-1.5 last:border-b-0">
      {/* Champion + role */}
      <div className="flex items-center gap-2 overflow-hidden">
        <Image
          src={getChampionIconUrl(p.champion_name)}
          alt={p.champion_name}
          width={24}
          height={24}
          className="shrink-0 rounded-sm"
          unoptimized
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">{p.champion_name}</p>
          <p className="font-mono text-[7px] tracking-wider text-[var(--color-text-muted)]">{p.role}</p>
        </div>
      </div>

      {/* KDA */}
      <div className="text-center font-mono text-[10px] text-[var(--color-text-primary)]">
        {formatKDA(p.kills, p.deaths, p.assists)}
      </div>

      {/* CS/min */}
      <div className="text-center font-mono text-[10px] text-[var(--color-text-secondary)]">
        {p.cs_per_min.toFixed(1)}
      </div>

      {/* Gold */}
      <div className="text-center font-mono text-[10px] text-[var(--color-text-secondary)]">
        {(p.gold_earned / 1000).toFixed(1)}k
      </div>

      {/* Damage */}
      <div className="text-center font-mono text-[10px] text-[var(--color-text-secondary)]">
        {(p.total_damage_dealt / 1000).toFixed(1)}k
      </div>

      {/* Vision */}
      <div className="text-center font-mono text-[10px] text-[var(--color-text-secondary)]">
        {p.vision_score}
      </div>

      {/* Items */}
      <div className="flex items-center justify-center gap-0.5 overflow-hidden">
        {p.items && p.items.length > 0 ? (
          p.items.map((itemId, idx) =>
            itemId > 0 ? (
              <Image
                key={idx}
                src={getItemIconUrl(itemId)}
                alt={`Item ${itemId}`}
                width={16}
                height={16}
                className="shrink-0 rounded-sm"
                unoptimized
              />
            ) : (
              <div key={idx} className="h-4 w-4 shrink-0 rounded-sm bg-[var(--color-border)]/30" />
            )
          )
        ) : null}
      </div>
    </div>
  );
}
