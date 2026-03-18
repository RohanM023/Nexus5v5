import { useCallback, useEffect, useState } from "react";
import { useNexus } from "../hooks/use-nexus";
import type { SynergyPair } from "../types";

interface SynergyChartProps {
  /** Champion IDs to compute synergy for. */
  champions: number[];
}

/**
 * Pairwise synergy heatmap for a set of champions.
 *
 * ```tsx
 * <NexusProvider config={config}>
 *   <SynergyChart champions={[1, 2, 3, 4, 5]} />
 * </NexusProvider>
 * ```
 */
export function SynergyChart({ champions }: SynergyChartProps) {
  const { client } = useNexus();
  const [pairs, setPairs] = useState<SynergyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSynergy = useCallback(async () => {
    if (champions.length < 2) {
      setPairs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await client.getSynergyData(champions);
      setPairs(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load synergy data",
      );
    } finally {
      setLoading(false);
    }
  }, [client, champions]);

  useEffect(() => {
    fetchSynergy();
  }, [fetchSynergy]);

  if (loading) {
    return (
      <div className="nexus-synergy-loading" style={styles.loading}>
        Loading synergy data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="nexus-synergy-error" style={styles.error}>
        {error}
      </div>
    );
  }

  if (pairs.length === 0) {
    return (
      <div className="nexus-synergy-empty" style={styles.empty}>
        Select at least 2 champions to see synergy.
      </div>
    );
  }

  // Build unique champion list from pairs
  const champMap = new Map<number, string>();
  for (const p of pairs) {
    champMap.set(p.championA.id, p.championA.name);
    champMap.set(p.championB.id, p.championB.name);
  }
  const champList = Array.from(champMap.entries());

  // Build lookup
  const scoreLookup = new Map<string, number>();
  for (const p of pairs) {
    const key = `${p.championA.id}-${p.championB.id}`;
    scoreLookup.set(key, p.synergyScore);
    scoreLookup.set(`${p.championB.id}-${p.championA.id}`, p.synergyScore);
  }

  return (
    <div className="nexus-synergy-chart" style={styles.container}>
      <h3 style={styles.heading}>Synergy Heatmap</h3>
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: `80px repeat(${champList.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        <div />
        {champList.map(([id, name]) => (
          <div key={id} style={styles.colHeader}>
            {name.slice(0, 6)}
          </div>
        ))}

        {/* Data rows */}
        {champList.map(([rowId, rowName]) => (
          <>
            <div key={`row-${rowId}`} style={styles.rowHeader}>
              {rowName.slice(0, 6)}
            </div>
            {champList.map(([colId]) => {
              const score =
                rowId === colId
                  ? null
                  : scoreLookup.get(`${rowId}-${colId}`) ?? null;
              return (
                <div
                  key={`${rowId}-${colId}`}
                  style={{
                    ...styles.cell,
                    background: score !== null ? getCellColor(score) : "#1a1d2e",
                  }}
                  title={
                    score !== null ? `Synergy: ${score.toFixed(1)}` : "—"
                  }
                >
                  {score !== null ? score.toFixed(0) : "—"}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function getCellColor(score: number): string {
  // Map 0-100 to red-yellow-green
  if (score >= 60) return `rgba(34, 197, 94, ${0.3 + (score - 60) * 0.0175})`;
  if (score >= 45) return `rgba(245, 158, 11, ${0.3 + (score - 45) * 0.02})`;
  return `rgba(239, 68, 68, ${0.3 + (45 - score) * 0.015})`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "var(--nexus-font, sans-serif)",
    background: "var(--nexus-surface, #1a1d2e)",
    color: "var(--nexus-text, #f1f5f9)",
    borderRadius: "var(--nexus-radius, 8px)",
    padding: "16px",
    maxWidth: "500px",
  },
  heading: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    color: "var(--nexus-text-muted, #94a3b8)",
    marginBottom: "12px",
  },
  grid: {
    display: "grid",
    gap: "2px",
  },
  colHeader: {
    fontSize: "10px",
    textAlign: "center" as const,
    color: "var(--nexus-text-muted, #94a3b8)",
    padding: "4px 0",
  },
  rowHeader: {
    fontSize: "10px",
    display: "flex",
    alignItems: "center",
    color: "var(--nexus-text-muted, #94a3b8)",
    paddingRight: "4px",
  },
  cell: {
    textAlign: "center" as const,
    padding: "6px",
    borderRadius: "2px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  loading: { padding: "24px", textAlign: "center" as const },
  error: { padding: "16px", color: "var(--nexus-danger, #ef4444)" },
  empty: {
    padding: "16px",
    color: "var(--nexus-text-muted, #94a3b8)",
    textAlign: "center" as const,
  },
};
