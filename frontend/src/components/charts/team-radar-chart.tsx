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
import type { RadarDataPoint } from "@/types";

interface TeamRadarChartProps {
  data: RadarDataPoint[];
}

export function TeamRadarChart({ data }: TeamRadarChartProps) {
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#18181f" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#6a6a78", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}
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
            stroke="#d97706"
            fill="#d97706"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          <Radar
            name="Opponent"
            dataKey="opponentTeam"
            stroke="#6a6a78"
            fill="#6a6a78"
            fillOpacity={0.08}
            strokeWidth={1}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", color: "#6a6a78" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
