"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn, formatKDA, formatKDARatio, formatCsPerMin, formatDuration, formatTimeAgo, getChampionIconUrl, getItemIconUrl } from "@/lib/utils";
import { getMatchNote, setMatchNote } from "@/lib/match-notes";
import { MatchDetail } from "@/components/match/match-detail";
import type { MatchSummary } from "@/types";

interface MatchRowProps {
  match: MatchSummary;
  expanded?: boolean;
  onToggle?: () => void;
}

export function MatchRow({ match, expanded, onToggle }: MatchRowProps) {
  const isWin = match.win;
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    const note = getMatchNote(match.match_id);
    if (note) setNoteText(note);
  }, [match.match_id]);

  return (
    <div>
      <div
        role={onToggle ? "button" : undefined}
        tabIndex={onToggle ? 0 : undefined}
        onClick={onToggle}
        onKeyDown={onToggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } } : undefined}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-hover)]",
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

        {/* Items */}
        {match.items && match.items.length > 0 && (
          <div className="hidden w-[148px] shrink-0 items-center gap-0.5 overflow-hidden lg:flex">
            {match.items.map((itemId, idx) =>
              itemId > 0 ? (
                <Image
                  key={idx}
                  src={getItemIconUrl(itemId)}
                  alt={`Item ${itemId}`}
                  width={20}
                  height={20}
                  className="shrink-0 rounded-sm"
                  unoptimized
                />
              ) : (
                <div key={idx} className="h-5 w-5 shrink-0 rounded-sm bg-[var(--color-border)]/30" />
              )
            )}
          </div>
        )}

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
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
            className={cn(
              "shrink-0 transition-colors",
              noteText ? "text-[var(--color-accent-text)]" : "text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100"
            )}
            title={noteText ? "Edit note" : "Add note"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
          {onToggle && (
            <span className={cn("text-[10px] text-[var(--color-text-muted)] transition-transform", expanded && "rotate-180")}>
              ▼
            </span>
          )}
        </div>
      </div>

      {isEditing && (
        <div
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value.slice(0, 200))}
            onBlur={() => { setMatchNote(match.match_id, noteText); setIsEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setMatchNote(match.match_id, noteText); setIsEditing(false); }
              if (e.key === "Escape") { setNoteText(getMatchNote(match.match_id) ?? ""); setIsEditing(false); }
            }}
            placeholder="Add a note..."
            className="w-full bg-transparent font-mono text-[10px] text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            maxLength={200}
            autoFocus
          />
        </div>
      )}

      {!isEditing && noteText && (
        <div
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
          <p className="font-mono text-[10px] text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]">
            {noteText}
          </p>
        </div>
      )}

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
      <div className="hidden lg:block w-[148px] text-center">Items</div>
      <div className="ml-auto w-16 text-right">Time</div>
    </div>
  );
}
