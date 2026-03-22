"use client";

import Image from "next/image";
import { cn, formatKDA, formatKDARatio, formatCsPerMin, formatDuration, formatTimeAgo, getChampionIconUrl } from "@/lib/utils";
import { MatchDetail } from "@/components/match/match-detail";
import type { MatchSummary } from "@/types";

interface MatchRowProps {
  match: MatchSummary;
  expanded?: boolean;
  onToggle?: () => void;
}

export function MatchRow({ match, expanded, onToggle }: MatchRowProps) {
  const isWin = match.win;

  return (
    <div>
      <div
        role={onToggle ? "button" : undefined}
        tabIndex={onToggle ? 0 : undefined}
        onClick={onToggle}
        onKeyDown={onToggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } } : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-hover)]",
          onToggle && "cursor-pointer select-none",
          isWin
            ? "border-l-2 border-l-[var(--color-success)]/60"
            : "border-l-2 border-l-[var(--color-danger)]/40"
        )}
      >
        {/* Champion icon */}
        <Image
          src={getChampionIconUrl(match.champion_name)}
          alt={match.champion_name}
          width={36}
          height={36}
          className="rounded-sm"
          unoptimized
        />

        {/* Champion + role */}
        <div className="w-24 min-w-0">
          <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
            {match.champion_name}
          </p>
          <p className="font-mono text-[8px] tracking-wider text-[var(--color-text-muted)]">
            {match.role}
          </p>
        </div>

        {/* W/L */}
        <span
          className={cn(
            "w-10 text-center font-mono text-[10px] font-medium",
            isWin ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
          )}
        >
          {isWin ? "W" : "L"}
        </span>

        {/* KDA */}
        <div className="w-20 text-center">
          <p className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
            {formatKDA(match.kills, match.deaths, match.assists)}
          </p>
          <p className="font-mono text-[8px] text-[var(--color-text-muted)]">
            {formatKDARatio(match.kills, match.deaths, match.assists)}
          </p>
        </div>

        {/* CS/min */}
        <div className="hidden w-14 text-center sm:block">
          <p className="font-mono text-xs text-[var(--color-text-primary)]">
            {formatCsPerMin(match.cs, match.game_duration)}
          </p>
          <p className="font-mono text-[8px] text-[var(--color-text-muted)]">cs/m</p>
        </div>

        {/* Gold */}
        <div className="hidden w-16 text-center md:block">
          <p className="font-mono text-xs text-[var(--color-text-primary)]">
            {(match.gold_earned / 1000).toFixed(1)}k
          </p>
          <p className="font-mono text-[8px] text-[var(--color-text-muted)]">gold</p>
        </div>

        {/* Vision */}
        <div className="hidden w-12 text-center md:block">
          <p className="font-mono text-xs text-[var(--color-text-primary)]">{match.vision_score}</p>
          <p className="font-mono text-[8px] text-[var(--color-text-muted)]">vis</p>
        </div>

        {/* Duration + time ago + expand indicator */}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-16 text-right">
            <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">
              {formatDuration(match.game_duration)}
            </p>
            <p className="font-mono text-[8px] text-[var(--color-text-muted)]">
              {formatTimeAgo(match.game_start)}
            </p>
          </div>
          {onToggle && (
            <span className={cn("text-[10px] text-[var(--color-text-muted)] transition-transform", expanded && "rotate-180")}>
              ▼
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <MatchDetail matchId={match.match_id} />
      )}
    </div>
  );
}

interface MatchListHeaderProps {
  className?: string;
}

export function MatchListHeader({ className }: MatchListHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-1.5 font-mono text-[8px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]", className)}>
      <div className="h-[36px] w-[36px]" /> {/* icon spacer */}
      <div className="w-24">Champion</div>
      <div className="w-10 text-center">Result</div>
      <div className="w-20 text-center">KDA</div>
      <div className="hidden w-14 text-center sm:block">CS/m</div>
      <div className="hidden w-16 text-center md:block">Gold</div>
      <div className="hidden w-12 text-center md:block">Vision</div>
      <div className="ml-auto w-16 text-right">Time</div>
    </div>
  );
}
