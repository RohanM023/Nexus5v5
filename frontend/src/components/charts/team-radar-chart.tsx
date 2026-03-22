"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import type { RadarDataPoint } from "@/types";

interface TeamRadarChartProps {
  data: RadarDataPoint[];
}

export function TeamRadarChart({ data }: TeamRadarChartProps) {
  const chartColors = useThemeColors();

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={chartColors.grid} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: chartColors.tick, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Your Team"
            dataKey="yourTeam"
            stroke={chartColors.primary}
            fill={chartColors.primary}
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          <Radar
            name="Opponent"
            dataKey="opponentTeam"
            stroke={chartColors.secondary}
            fill={chartColors.secondary}
            fillOpacity={0.08}
            strokeWidth={1}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", color: chartColors.tick }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
