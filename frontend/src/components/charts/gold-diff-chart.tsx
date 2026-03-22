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

interface GoldDiffChartProps {
  timeline: number[];
  matchId?: string;
}

export function GoldDiffChart({ timeline, matchId }: GoldDiffChartProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gold Difference</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            No gold diff data available for this match.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = timeline.map((value, index) => ({
    minute: index,
    goldDiff: value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Gold Difference
          {matchId && (
            <span className="ml-2 font-mono text-[9px] font-normal tracking-wider text-[var(--color-text-muted)]">
              {matchId}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181f" />
            <XAxis
              dataKey="minute"
              stroke="#363640"
              tick={{ fill: "#6a6a78", fontSize: 10, fontFamily: "var(--font-jetbrains-mono)" }}
              label={{
                value: "Min",
                position: "insideBottomRight",
                offset: -5,
                fill: "#363640",
                fontSize: 9,
              }}
            />
            <YAxis
              stroke="#363640"
              tick={{ fill: "#6a6a78", fontSize: 10, fontFamily: "var(--font-jetbrains-mono)" }}
              label={{
                value: "Gold",
                angle: -90,
                position: "insideLeft",
                fill: "#363640",
                fontSize: 9,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#050507",
                border: "1px solid #18181f",
                borderRadius: "0",
                color: "#d4d4dc",
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 11,
              }}
              labelFormatter={(label) => `Min ${label}`}
              formatter={(value) => {
                const v = Number(value);
                return [
                  `${v > 0 ? "+" : ""}${v.toLocaleString()}`,
                  "Gold Diff",
                ];
              }}
            />
            <ReferenceLine y={0} stroke="#222230" strokeDasharray="3 3" />
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="goldDiff"
              stroke="#d97706"
              strokeWidth={1.5}
              fill="url(#goldGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#d97706",
                stroke: "#050507",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
