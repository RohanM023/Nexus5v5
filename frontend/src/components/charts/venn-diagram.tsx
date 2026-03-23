"use client";

import { useState } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";

interface VennDiagramProps {
  leftCount: number;
  rightCount: number;
  overlapCount: number;
  leftLabel: string;
  rightLabel: string;
  overlapPercentage: number;
}

export function VennDiagram({
  leftCount,
  rightCount,
  overlapCount,
  leftLabel,
  rightLabel,
  overlapPercentage,
}: VennDiagramProps) {
  const theme = useThemeStore((s) => s.theme);
  const [hovered, setHovered] = useState<"left" | "right" | "center" | null>(null);

  const teamBlue = theme.colors.teamBlue;
  const teamRed = theme.colors.teamRed;
  const textPrimary = theme.colors.textPrimary;
  const textMuted = theme.colors.textMuted;
  const accent = theme.colors.accent;

  // Circle geometry
  const cx1 = 155;
  const cx2 = 255;
  const cy = 130;
  const r = 105;

  return (
    <svg
      viewBox="0 0 410 260"
      className="w-full"
      role="img"
      aria-label={`Venn diagram: ${leftLabel} (${leftCount} exclusive), ${overlapCount} shared, ${rightLabel} (${rightCount} exclusive)`}
    >
      {/* Left circle */}
      <circle
        cx={cx1}
        cy={cy}
        r={r}
        fill={teamBlue}
        fillOpacity={hovered === "left" ? 0.3 : 0.15}
        stroke={teamBlue}
        strokeWidth={hovered === "left" ? 2 : 1}
        strokeOpacity={0.5}
        className="transition-all duration-200"
        onMouseEnter={() => setHovered("left")}
        onMouseLeave={() => setHovered(null)}
      />

      {/* Right circle */}
      <circle
        cx={cx2}
        cy={cy}
        r={r}
        fill={teamRed}
        fillOpacity={hovered === "right" ? 0.3 : 0.15}
        stroke={teamRed}
        strokeWidth={hovered === "right" ? 2 : 1}
        strokeOpacity={0.5}
        className="transition-all duration-200"
        onMouseEnter={() => setHovered("right")}
        onMouseLeave={() => setHovered(null)}
      />

      {/* Center overlap highlight */}
      <clipPath id="clip-left">
        <circle cx={cx1} cy={cy} r={r} />
      </clipPath>
      <circle
        cx={cx2}
        cy={cy}
        r={r}
        clipPath="url(#clip-left)"
        fill={accent}
        fillOpacity={hovered === "center" ? 0.35 : 0.2}
        className="transition-all duration-200 cursor-pointer"
        onMouseEnter={() => setHovered("center")}
        onMouseLeave={() => setHovered(null)}
      />

      {/* Left count */}
      <text
        x={cx1 - 42}
        y={cy - 8}
        textAnchor="middle"
        fill={hovered === "left" ? teamBlue : textPrimary}
        fontSize="22"
        fontWeight="600"
        fontFamily="monospace"
        className="transition-all duration-200"
      >
        {leftCount}
      </text>
      <text
        x={cx1 - 42}
        y={cy + 12}
        textAnchor="middle"
        fill={textMuted}
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="0.05em"
      >
        exclusive
      </text>

      {/* Center count */}
      <text
        x={205}
        y={cy - 12}
        textAnchor="middle"
        fill={hovered === "center" ? accent : textPrimary}
        fontSize="24"
        fontWeight="700"
        fontFamily="monospace"
        className="transition-all duration-200"
      >
        {overlapCount}
      </text>
      <text
        x={205}
        y={cy + 6}
        textAnchor="middle"
        fill={textMuted}
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="0.05em"
      >
        shared
      </text>
      <text
        x={205}
        y={cy + 22}
        textAnchor="middle"
        fill={accent}
        fontSize="11"
        fontWeight="600"
        fontFamily="monospace"
      >
        {overlapPercentage}%
      </text>

      {/* Right count */}
      <text
        x={cx2 + 42}
        y={cy - 8}
        textAnchor="middle"
        fill={hovered === "right" ? teamRed : textPrimary}
        fontSize="22"
        fontWeight="600"
        fontFamily="monospace"
        className="transition-all duration-200"
      >
        {rightCount}
      </text>
      <text
        x={cx2 + 42}
        y={cy + 12}
        textAnchor="middle"
        fill={textMuted}
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="0.05em"
      >
        exclusive
      </text>

      {/* Labels */}
      <text
        x={cx1 - 30}
        y={248}
        textAnchor="middle"
        fill={teamBlue}
        fontSize="10"
        fontWeight="500"
        fontFamily="monospace"
        letterSpacing="0.08em"
      >
        {leftLabel.length > 18 ? leftLabel.slice(0, 16) + ".." : leftLabel}
      </text>
      <text
        x={cx2 + 30}
        y={248}
        textAnchor="middle"
        fill={teamRed}
        fontSize="10"
        fontWeight="500"
        fontFamily="monospace"
        letterSpacing="0.08em"
      >
        {rightLabel.length > 18 ? rightLabel.slice(0, 16) + ".." : rightLabel}
      </text>
    </svg>
  );
}
