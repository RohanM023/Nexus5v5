import { useEffect } from "react";
import { useNexusDraft } from "../hooks/use-nexus-draft";
import type { DraftSuggestion } from "../types";

interface DraftAssistantProps {
  /** PUUIDs of the team members for comfort score lookup. */
  teamPuuids?: string[];
  /** Draft mode. */
  mode?: "clash" | "custom" | "scrim";
  /** Called when the draft session completes. */
  onDraftComplete?: (sessionId: string) => void;
}

/**
 * Self-contained draft board + suggestion panel.
 * Manages its own draft session, scores, and champion suggestions.
 *
 * ```tsx
 * <NexusProvider config={config}>
 *   <DraftAssistant teamPuuids={["puuid1", "puuid2"]} />
 * </NexusProvider>
 * ```
 */
export function DraftAssistant({
  mode = "clash",
  onDraftComplete,
}: DraftAssistantProps) {
  const {
    sessionId,
    scores,
    suggestions,
    loading,
    error,
    createSession,
    pick,
    ban,
  } = useNexusDraft();

  useEffect(() => {
    createSession(mode);
  }, [mode, createSession]);

  if (error) {
    return (
      <div className="nexus-draft-error" style={styles.error}>
        <p>Failed to load draft: {error}</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="nexus-draft-loading" style={styles.loading}>
        Loading draft...
      </div>
    );
  }

  return (
    <div className="nexus-draft-assistant" style={styles.container}>
      {/* Score Summary */}
      <div className="nexus-draft-scores" style={styles.scoreBar}>
        <ScoreBadge label="Synergy" value={scores?.synergyScore ?? 0} />
        <ScoreBadge label="Counter" value={scores?.counterScore ?? 0} />
        <ScoreBadge label="Comfort" value={scores?.comfortScore ?? 0} />
        <ScoreBadge
          label="Total"
          value={scores?.totalScore ?? 0}
          highlight
        />
      </div>

      {/* Suggestions */}
      <div className="nexus-draft-suggestions" style={styles.suggestions}>
        <h3 style={styles.heading}>Recommended Picks</h3>
        {loading && <p style={styles.muted}>Updating...</p>}
        {suggestions.length === 0 && !loading && (
          <p style={styles.muted}>No suggestions available</p>
        )}
        {suggestions.slice(0, 10).map((s, i) => (
          <SuggestionRow
            key={s.champion.id}
            rank={i + 1}
            suggestion={s}
            onPick={(champId) => pick(champId, "mid")}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        ...styles.badge,
        ...(highlight ? styles.badgeHighlight : {}),
      }}
    >
      <span style={styles.badgeLabel}>{label}</span>
      <span style={styles.badgeValue}>{value.toFixed(1)}</span>
    </div>
  );
}

function SuggestionRow({
  rank,
  suggestion,
  onPick,
}: {
  rank: number;
  suggestion: DraftSuggestion;
  onPick: (championId: number) => void;
}) {
  return (
    <div className="nexus-suggestion-row" style={styles.suggestionRow}>
      <span style={styles.rank}>#{rank}</span>
      <img
        src={suggestion.champion.iconUrl}
        alt={suggestion.champion.name}
        width={32}
        height={32}
        style={styles.icon}
      />
      <span style={styles.champName}>{suggestion.champion.name}</span>
      <span style={styles.score}>{suggestion.compositeScore.toFixed(1)}</span>
      <button
        onClick={() => onPick(suggestion.champion.id)}
        style={styles.pickBtn}
      >
        Pick
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "var(--nexus-font, sans-serif)",
    background: "var(--nexus-surface, #1a1d2e)",
    color: "var(--nexus-text, #f1f5f9)",
    borderRadius: "var(--nexus-radius, 8px)",
    padding: "16px",
    maxWidth: "480px",
  },
  scoreBar: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  badge: {
    flex: 1,
    textAlign: "center" as const,
    padding: "8px",
    background: "var(--nexus-bg, #0f1117)",
    borderRadius: "var(--nexus-radius, 8px)",
  },
  badgeHighlight: {
    border: "1px solid var(--nexus-primary, #6366f1)",
  },
  badgeLabel: {
    display: "block",
    fontSize: "11px",
    color: "var(--nexus-text-muted, #94a3b8)",
    textTransform: "uppercase" as const,
  },
  badgeValue: { display: "block", fontSize: "18px", fontWeight: "bold" },
  heading: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "8px",
    textTransform: "uppercase" as const,
    color: "var(--nexus-text-muted, #94a3b8)",
  },
  suggestions: {},
  suggestionRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 0",
    borderBottom: "1px solid var(--nexus-border, #2d3348)",
  },
  rank: { width: "28px", color: "var(--nexus-text-muted, #94a3b8)" },
  icon: { borderRadius: "4px" },
  champName: { flex: 1 },
  score: { fontWeight: "bold", color: "var(--nexus-primary, #6366f1)" },
  pickBtn: {
    background: "var(--nexus-primary, #6366f1)",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "4px 12px",
    cursor: "pointer",
    fontSize: "12px",
  },
  loading: { padding: "24px", textAlign: "center" as const },
  error: { padding: "16px", color: "var(--nexus-danger, #ef4444)" },
  muted: { color: "var(--nexus-text-muted, #94a3b8)", fontSize: "13px" },
};
