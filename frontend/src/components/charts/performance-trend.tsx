"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import type { RecentFormPoint } from "@/types";

interface PerformanceTrendProps {
  data: RecentFormPoint[];
}

export function PerformanceTrend({ data }: PerformanceTrendProps) {
  const chartColors = useThemeColors();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            Not enough data to show a trend yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    winRate: Math.round(point.win_rate * 100),
    games: point.games,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis
              dataKey="date"
              stroke={chartColors.axis}
              tick={{ fill: chartColors.tick, fontSize: 10, fontFamily: "var(--font-jetbrains-mono)" }}
            />
            <YAxis
              stroke={chartColors.axis}
              tick={{ fill: chartColors.tick, fontSize: 10, fontFamily: "var(--font-jetbrains-mono)" }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "0",
                color: chartColors.foreground,
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 11,
              }}
              formatter={(value, name) => {
                const v = Number(value);
                if (name === "winRate") return [`${v}%`, "Win Rate"];
                return [v, "Games"];
              }}
            />
            <Line
              type="monotone"
              dataKey="winRate"
              stroke={chartColors.primary}
              strokeWidth={1.5}
              dot={{ fill: chartColors.primary, stroke: chartColors.background, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: chartColors.accentHover }}
            />
            <Line
              type="monotone"
              dataKey="games"
              stroke={chartColors.secondary}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center justify-center gap-6 font-mono text-[9px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <div className="h-px w-4 bg-[var(--color-chart-primary)]" />
            <span>Win Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-4 border-t border-dashed border-[var(--color-text-muted)]" />
            <span>Games</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
