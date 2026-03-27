"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RankedEntry, MatchSummary } from "@/types";

const TIER_ORDER = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
];
const RANK_ORDER = ["IV", "III", "II", "I"];

function toAbsoluteLP(tier: string, rank: string, lp: number): number {
  const tierIdx = TIER_ORDER.indexOf(tier.toUpperCase());
  const rankIdx = RANK_ORDER.indexOf(rank);
  if (tierIdx < 0) return 0;
  // Master+ has no divisions
  if (tierIdx >= 7) return tierIdx * 400 + lp;
  return tierIdx * 400 + (rankIdx >= 0 ? rankIdx * 100 : 0) + lp;
}

function fromAbsoluteLP(absLP: number): string {
  if (absLP < 0) return "Iron IV";
  const tierIdx = Math.min(Math.floor(absLP / 400), TIER_ORDER.length - 1);
  const tier = TIER_ORDER[tierIdx];
  if (tierIdx >= 7) {
    return tier;
  }
  const remaining = absLP - tierIdx * 400;
  const rankIdx = Math.min(Math.floor(remaining / 100), 3);
  return `${tier} ${RANK_ORDER[rankIdx]}`;
}

interface DataPoint {
  game: number;
  date: string;
  lp: number;
  result: "W" | "L";
}

interface RankProgressionProps {
  soloEntry: RankedEntry | null;
  matches: MatchSummary[];
}

const LP_PER_GAME = 15;

const MAX_GAMES = 20;

export function RankProgression({ soloEntry, matches }: RankProgressionProps) {
  if (!soloEntry || matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rank Progression</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-xs text-[var(--color-text-muted)]">
          No ranked data available.
        </CardContent>
      </Card>
    );
  }

  const currentLP = toAbsoluteLP(soloEntry.tier, soloEntry.rank, soloEntry.league_points);

  // Sort matches newest first, take last N, then reverse to oldest first
  const sorted = [...matches]
    .sort((a, b) => new Date(b.game_start).getTime() - new Date(a.game_start).getTime())
    .slice(0, MAX_GAMES)
    .reverse();

  // Walk backwards from current LP to estimate historical LP
  let estimatedLP = currentLP;
  const rawPoints: { date: string; lp: number; result: "W" | "L" }[] = [];

  // Walk from most recent to oldest to estimate LP at each point
  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    rawPoints.unshift({
      date: new Date(m.game_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      lp: estimatedLP,
      result: m.win ? "W" : "L",
    });
    // Reverse the result to go back in time
    estimatedLP += m.win ? -LP_PER_GAME : LP_PER_GAME;
    if (estimatedLP < 0) estimatedLP = 0;
  }

  const data: DataPoint[] = rawPoints.map((p, i) => ({
    game: i + 1,
    date: p.date,
    lp: p.lp,
    result: p.result,
  }));

  // Determine Y-axis range
  const lpValues = data.map((d) => d.lp);
  const minLP = Math.min(...lpValues);
  const maxLP = Math.max(...lpValues);
  const yMin = Math.max(0, Math.floor(minLP / 400) * 400);
  const yMax = Math.ceil((maxLP + 50) / 400) * 400;

  // Tier boundaries within range
  const tierBoundaries: { lp: number; label: string }[] = [];
  for (let i = 0; i < TIER_ORDER.length; i++) {
    const boundary = i * 400;
    if (boundary >= yMin && boundary <= yMax) {
      tierBoundaries.push({ lp: boundary, label: TIER_ORDER[i] });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rank Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent-text)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-accent-text)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fromAbsoluteLP(v)}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "10px",
              }}
              labelStyle={{ color: "var(--color-text-secondary)" }}
              formatter={(value: unknown) => {
                const v = Number(value);
                return [
                  `${fromAbsoluteLP(v)} (${v % 100} LP)`,
                  "",
                ];
              }}
            />
            {tierBoundaries.map((tb) => (
              <ReferenceLine
                key={tb.label}
                y={tb.lp}
                stroke="var(--color-border)"
                strokeDasharray="6 3"
                label={{
                  value: tb.label,
                  position: "insideTopLeft",
                  style: {
                    fontSize: 8,
                    fontFamily: "monospace",
                    fill: "var(--color-text-muted)",
                  },
                }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="lp"
              stroke="var(--color-accent-text)"
              strokeWidth={1.5}
              fill="url(#lpGradient)"
              dot={(props) => {
                const { cx, cy, index } = props as { cx?: number; cy?: number; index?: number };
                const point = index != null ? data[index] : undefined;
                if (cx == null || cy == null || !point) return <circle key={index ?? 0} />;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={point.result === "W" ? "var(--color-success)" : "var(--color-danger)"}
                    stroke="var(--color-surface)"
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={(props) => {
                const { cx, cy, index } = props as { cx?: number; cy?: number; index?: number };
                const point = index != null ? data[index] : undefined;
                if (cx == null || cy == null || !point) return <circle key={`active-${index ?? 0}`} />;
                return (
                  <circle
                    key={`active-${index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={point.result === "W" ? "var(--color-success)" : "var(--color-danger)"}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
