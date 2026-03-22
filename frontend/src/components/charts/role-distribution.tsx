"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import type { RoleDistribution as RoleDistributionData } from "@/types";

interface RoleDistributionProps {
  data: RoleDistributionData[];
}

const ROLE_COLORS: Record<string, string> = {
  TOP: "#d97706",
  JUNGLE: "#10b981",
  MID: "#f59e0b",
  BOT: "#ef4444",
  SUPPORT: "#6a6a78",
};

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MID: "Mid",
  BOT: "Bot",
  SUPPORT: "Support",
};

export function RoleDistributionChart({ data }: RoleDistributionProps) {
  const chartColors = useThemeColors();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            No role data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: ROLE_LABELS[item.role] || item.role,
    value: item.games,
    percentage: item.percentage,
    fill: ROLE_COLORS[item.role] || chartColors.axis,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "0",
                color: chartColors.foreground,
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 11,
              }}
              formatter={(value, name) => [
                `${Number(value)} games`,
                String(name),
              ]}
            />
            <Legend
              formatter={(value) => (
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
