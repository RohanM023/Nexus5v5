"use client";

import Image from "next/image";
import { cn, getChampionIconUrl, formatDuration, formatTimeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeadToHeadResponse, HeadToHeadMatch } from "@/types";

interface HeadToHeadProps {
  data: HeadToHeadResponse;
  player1Label: string;
  player2Label: string;
}

export function HeadToHead({ data, player1Label, player2Label }: HeadToHeadProps) {
  if (data.total_games === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Head-to-Head</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center font-mono text-[10px] text-[var(--color-text-muted)]">
            No shared games found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Head-to-Head</CardTitle>
          <span className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
            {data.total_games} games
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="flex items-center justify-center gap-6 font-mono text-[10px]">
          <div className="text-center">
            <p className="text-[var(--color-text-muted)]">Allies</p>
            <p className="text-lg font-bold text-[var(--color-success)]">{data.same_team_games}</p>
          </div>
          <div className="text-center">
            <p className="text-[var(--color-text-muted)]">Opponents</p>
            <p className="text-lg font-bold text-[var(--color-danger)]">{data.opposite_team_games}</p>
          </div>
          {data.opposite_team_games > 0 && (
            <div className="text-center">
              <p className="text-[var(--color-text-muted)]">VS Record</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">
                {data.p1_wins_vs} - {data.p2_wins_vs}
              </p>
            </div>
          )}
        </div>

        {/* Match list */}
        <div className="space-y-1">
          {data.matches.map((match: HeadToHeadMatch) => (
            <H2HMatchRow
              key={match.match_id}
              match={match}
              player1Label={player1Label}
              player2Label={player2Label}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function H2HMatchRow({
  match,
  player1Label,
  player2Label,
}: {
  match: HeadToHeadMatch;
  player1Label: string;
  player2Label: string;
}) {
  const p1 = match.player1;
  const p2 = match.player2;

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]">
      {/* Player 1 */}
      <div className="flex items-center gap-1.5">
        <Image
          src={getChampionIconUrl(p1.champion_name)}
          alt={p1.champion_name}
          width={24}
          height={24}
          className="rounded-sm"
          unoptimized
        />
        <div className="w-16 text-right">
          <p className="truncate font-mono text-[10px] text-[var(--color-text-primary)]">
            {p1.kills}/{p1.deaths}/{p1.assists}
          </p>
        </div>
      </div>

      {/* Indicator */}
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider",
          match.same_team
            ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
            : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
        )}
      >
        {match.same_team ? "ALLY" : "VS"}
      </span>

      {/* Player 2 */}
      <div className="flex items-center gap-1.5">
        <div className="w-16">
          <p className="font-mono text-[10px] text-[var(--color-text-primary)]">
            {p2.kills}/{p2.deaths}/{p2.assists}
          </p>
        </div>
        <Image
          src={getChampionIconUrl(p2.champion_name)}
          alt={p2.champion_name}
          width={24}
          height={24}
          className="rounded-sm"
          unoptimized
        />
      </div>

      {/* Time */}
      <div className="ml-auto text-right">
        <p className="font-mono text-[9px] text-[var(--color-text-muted)]">
          {formatDuration(match.game_duration)}
        </p>
        <p className="font-mono text-[8px] text-[var(--color-text-muted)]">
          {formatTimeAgo(match.game_start)}
        </p>
      </div>
    </div>
  );
}
