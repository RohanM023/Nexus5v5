"use client";

interface WinLossSparklineProps {
  results: boolean[];
}

export function WinLossSparkline({ results }: WinLossSparklineProps) {
  if (results.length === 0) return null;

  const dotSize = 4;
  const gap = 3;
  const width = results.length * (dotSize + gap) - gap;
  const height = dotSize;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      {results.map((win, i) => (
        <circle
          key={i}
          cx={i * (dotSize + gap) + dotSize / 2}
          cy={dotSize / 2}
          r={dotSize / 2}
          fill={win ? "var(--color-success)" : "var(--color-danger)"}
        />
      ))}
    </svg>
  );
}
