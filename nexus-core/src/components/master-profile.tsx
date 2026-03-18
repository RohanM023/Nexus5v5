import { useCallback, useEffect, useState } from "react";
import { useNexus } from "../hooks/use-nexus";
import type { ChampionPoolEntry, MasterProfileData } from "../types";

interface MasterProfileProps {
  /** User ID or PUUID to display the profile for. */
  userId: string;
  /** Max champions to show in the pool grid. */
  maxChampions?: number;
}

/**
 * Self-contained profile display showing champion pool, stats, and linked accounts.
 *
 * ```tsx
 * <NexusProvider config={config}>
 *   <MasterProfile userId="some-uuid" />
 * </NexusProvider>
 * ```
 */
export function MasterProfile({
  userId,
  maxChampions = 12,
}: MasterProfileProps) {
  const { client } = useNexus();
  const [profile, setProfile] = useState<MasterProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await client.getProfile(userId);
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [client, userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="nexus-profile-loading" style={styles.loading}>
        Loading profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="nexus-profile-error" style={styles.error}>
        {error ?? "Profile not found"}
      </div>
    );
  }

  return (
    <div className="nexus-master-profile" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.name}>{profile.displayName}</h2>
        <div style={styles.stats}>
          <StatBadge label="Games" value={String(profile.totalGames)} />
          <StatBadge
            label="Win Rate"
            value={`${(profile.overallWinRate * 100).toFixed(1)}%`}
          />
          <StatBadge
            label="Accounts"
            value={String(profile.linkedAccounts.length)}
          />
        </div>
      </div>

      {/* Champion Pool */}
      <h3 style={styles.sectionTitle}>Champion Pool</h3>
      <div style={styles.champGrid}>
        {profile.championPool.slice(0, maxChampions).map((entry) => (
          <ChampionCard key={entry.champion.id} entry={entry} />
        ))}
      </div>

      {/* Linked Accounts */}
      <h3 style={styles.sectionTitle}>Linked Accounts</h3>
      <div style={styles.accountList}>
        {profile.linkedAccounts.map((acc) => (
          <div key={acc.accountId} style={styles.accountRow}>
            <span>
              {acc.gameName}#{acc.tagLine}
            </span>
            <span style={styles.region}>{acc.region.toUpperCase()}</span>
            {acc.verified && <span style={styles.verified}>Verified</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statBadge}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

function ChampionCard({ entry }: { entry: ChampionPoolEntry }) {
  const tierColors: Record<string, string> = {
    S: "#f59e0b",
    A: "#22c55e",
    B: "#6366f1",
    C: "#94a3b8",
  };

  return (
    <div className="nexus-champion-card" style={styles.champCard}>
      <img
        src={entry.champion.iconUrl}
        alt={entry.champion.name}
        width={48}
        height={48}
        style={styles.champIcon}
      />
      <span style={styles.champName}>{entry.champion.name}</span>
      <div style={styles.champMeta}>
        <span
          style={{
            ...styles.tier,
            color: tierColors[entry.tier] ?? "#94a3b8",
          }}
        >
          {entry.tier}
        </span>
        <span style={styles.masteryBar}>
          <span
            style={{
              ...styles.masteryFill,
              width: `${entry.trueMastery}%`,
            }}
          />
        </span>
      </div>
      <span style={styles.champWr}>
        {(entry.winRate * 100).toFixed(0)}% WR
      </span>
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
    maxWidth: "600px",
  },
  header: { marginBottom: "16px" },
  name: { margin: "0 0 8px 0", fontSize: "20px" },
  stats: { display: "flex", gap: "8px" },
  statBadge: {
    padding: "6px 12px",
    background: "var(--nexus-bg, #0f1117)",
    borderRadius: "var(--nexus-radius, 8px)",
    textAlign: "center" as const,
  },
  statLabel: {
    display: "block",
    fontSize: "10px",
    textTransform: "uppercase" as const,
    color: "var(--nexus-text-muted, #94a3b8)",
  },
  statValue: { display: "block", fontSize: "16px", fontWeight: "bold" },
  sectionTitle: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    color: "var(--nexus-text-muted, #94a3b8)",
    margin: "16px 0 8px 0",
  },
  champGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: "8px",
  },
  champCard: {
    textAlign: "center" as const,
    padding: "8px",
    background: "var(--nexus-bg, #0f1117)",
    borderRadius: "var(--nexus-radius, 8px)",
  },
  champIcon: { borderRadius: "50%", marginBottom: "4px" },
  champName: { display: "block", fontSize: "12px", fontWeight: 600 },
  champMeta: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "4px",
  },
  tier: { fontSize: "14px", fontWeight: "bold" },
  masteryBar: {
    flex: 1,
    height: "4px",
    background: "var(--nexus-border, #2d3348)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  masteryFill: {
    display: "block",
    height: "100%",
    background: "var(--nexus-primary, #6366f1)",
    borderRadius: "2px",
  },
  champWr: {
    display: "block",
    fontSize: "10px",
    color: "var(--nexus-text-muted, #94a3b8)",
    marginTop: "2px",
  },
  accountList: { display: "flex", flexDirection: "column" as const, gap: "4px" },
  accountRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "6px 8px",
    background: "var(--nexus-bg, #0f1117)",
    borderRadius: "4px",
    fontSize: "13px",
  },
  region: {
    fontSize: "11px",
    color: "var(--nexus-text-muted, #94a3b8)",
  },
  verified: {
    fontSize: "10px",
    color: "var(--nexus-success, #22c55e)",
    marginLeft: "auto",
  },
  loading: { padding: "24px", textAlign: "center" as const },
  error: { padding: "16px", color: "var(--nexus-danger, #ef4444)" },
};
