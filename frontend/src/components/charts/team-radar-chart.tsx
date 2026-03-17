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
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
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
            stroke="#14b8a6"
            fill="#14b8a6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name="Opponent Team"
            dataKey="opponentTeam"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
