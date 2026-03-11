"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoleDistribution as RoleDistributionData } from "@/types";

interface RoleDistributionProps {
  data: RoleDistributionData[];
}

const ROLE_COLORS: Record<string, string> = {
  TOP: "#f59e0b",
  JUNGLE: "#10b981",
  MID: "#3b82f6",
  BOT: "#ef4444",
  SUPPORT: "#8b5cf6",
};

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MID: "Mid",
  BOT: "Bot",
  SUPPORT: "Support",
};

export function RoleDistributionChart({ data }: RoleDistributionProps) {
  const chartData = data.map((item) => ({
    name: ROLE_LABELS[item.role] || item.role,
    value: item.games,
    percentage: item.percentage,
    fill: ROLE_COLORS[item.role] || "#64748b",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                color: "#e2e8f0",
              }}
              formatter={(value: number, name: string) => [
                `${value} games`,
                name,
              ]}
            />
            <Legend
              formatter={(value) => (
                <span className="text-sm text-slate-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
