"use client";

import {
  LineChart,
  Line,
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
            <span className="ml-2 text-sm font-normal text-slate-500">
              {matchId}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="minute"
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              label={{
                value: "Minutes",
                position: "insideBottomRight",
                offset: -5,
                fill: "#64748b",
              }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              label={{
                value: "Gold",
                angle: -90,
                position: "insideLeft",
                fill: "#64748b",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                color: "#e2e8f0",
              }}
              labelFormatter={(label) => `Minute ${label}`}
              formatter={(value: number) => [
                `${value > 0 ? "+" : ""}${value.toLocaleString()}`,
                "Gold Diff",
              ]}
            />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Line
              type="monotone"
              dataKey="goldDiff"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: "#3b82f6",
                stroke: "#0f172a",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
