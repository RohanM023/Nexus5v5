"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  CrawlerStatus,
  DbStats,
  HealthStatus,
  RiotQuotaStatus,
} from "@/types";

// ---------------------------------------------------------------------------
// Stat cell
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  mono = false,
  accent = false,
  className,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-semibold leading-none",
          mono && "font-mono",
          accent
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-text-primary)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------

function StatusDot({
  active,
  color = "success",
  label,
}: {
  active: boolean;
  color?: "success" | "danger" | "warning" | "muted";
  label: string;
}) {
  const colorMap = {
    success: "bg-[var(--color-success)]",
    danger: "bg-[var(--color-danger)]",
    warning: "bg-[var(--color-warning)]",
    muted: "bg-[var(--color-text-muted)]",
  };

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {active && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              colorMap[color]
            )}
          />
        )}
        <span
          className={cn("relative inline-flex h-2 w-2 rounded-full", colorMap[color])}
        />
      </span>
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------

function ActionButton({
  children,
  onClick,
  variant = "default",
  loading = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
  loading?: boolean;
  disabled?: boolean;
}) {
  const variantStyles = {
    default:
      "border-[var(--color-border-hover)] bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
    danger:
      "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10",
    success:
      "border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-[var(--color-success)] hover:bg-[var(--color-success)]/10",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center gap-2 rounded border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-all",
        "disabled:pointer-events-none disabled:opacity-40",
        variantStyles[variant]
      )}
    >
      {loading && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Quota bar
// ---------------------------------------------------------------------------

function QuotaBar({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= 80
      ? "bg-[var(--color-danger)]"
      : pct >= 50
        ? "bg-[var(--color-warning)]"
        : "bg-[var(--color-accent)]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
          {label}
        </span>
        <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ingestion mini chart (last 14 days bar chart)
// ---------------------------------------------------------------------------

function IngestionChart({
  days,
}: {
  days: { day: string; matches: number; players: number }[];
}) {
  if (!days.length) {
    return (
      <div className="flex h-28 items-center justify-center text-xs text-[var(--color-text-muted)]">
        No data yet
      </div>
    );
  }

  const reversed = [...days].reverse();
  const maxMatches = Math.max(...reversed.map((d) => d.matches), 1);

  return (
    <div className="flex h-28 items-end gap-[3px]">
      {reversed.map((d) => {
        const h = Math.max((d.matches / maxMatches) * 100, 2);
        return (
          <div
            key={d.day}
            className="group relative flex flex-1 flex-col items-center"
          >
            <div className="pointer-events-none absolute -top-14 z-10 hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] shadow-lg group-hover:block">
              <div className="font-mono text-[var(--color-text-primary)]">
                {d.matches.toLocaleString()} matches
              </div>
              <div className="text-[var(--color-text-muted)]">{d.day}</div>
            </div>
            <div
              className="w-full rounded-sm bg-[var(--color-accent)] transition-all hover:bg-[var(--color-accent-hover)]"
              style={{ height: `${h}%`, opacity: 0.3 + (h / 100) * 0.7 }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log line
// ---------------------------------------------------------------------------

function LogEntry({ message, time }: { message: string; time?: string }) {
  return (
    <div className="flex gap-3 font-mono text-[11px] leading-relaxed">
      {time && (
        <span className="shrink-0 text-[var(--color-text-muted)]">{time}</span>
      )}
      <span className="text-[var(--color-text-secondary)]">{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [quota, setQuota] = useState<RiotQuotaStatus | null>(null);
  const [crawler, setCrawler] = useState<CrawlerStatus | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [logs, setLogs] = useState<{ message: string; time: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [{ message, time }, ...prev].slice(0, 50));
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [h, q, c, d] = await Promise.allSettled([
        api.getHealth(),
        api.getRiotQuota(),
        api.getCrawlerStatus(),
        api.getDbStats(),
      ]);

      if (h.status === "fulfilled") setHealth(h.value);
      if (q.status === "fulfilled") setQuota(q.value);
      if (c.status === "fulfilled") setCrawler(c.value);
      if (d.status === "fulfilled") setDbStats(d.value);

      setError(null);
    } catch {
      setError("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    addLog("Admin panel loaded — fetching system status");
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll, addLog]);

  const handleKillSwitch = async () => {
    setActionLoading("kill");
    try {
      const result = await api.toggleCrawlerKillSwitch();
      addLog(
        result.kill_switch_active
          ? "KILL SWITCH ACTIVATED — crawler halted"
          : "Kill switch deactivated — crawler will resume"
      );
      await fetchAll();
    } catch {
      addLog("ERROR: Failed to toggle kill switch");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeed = async () => {
    setActionLoading("seed");
    try {
      const result = await api.triggerCrawlerSeed();
      addLog(
        `Seed complete: ${result.players_queued} players queued from ladder`
      );
      await fetchAll();
    } catch {
      addLog("ERROR: Seed failed — check API key and quota");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setActionLoading("refresh");
    addLog("Refreshing all panels...");
    await fetchAll();
    addLog("Refresh complete");
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            Loading admin panel...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold tracking-wide text-[var(--color-text-primary)]">
            System Admin
          </h1>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
            Crawler control &middot; API quota &middot; Database stats
          </p>
        </div>
        <div className="flex items-center gap-3">
          {health && (
            <StatusDot
              active={health.status === "ok"}
              color={health.status === "ok" ? "success" : "danger"}
              label={`${health.version} ${health.environment}`}
            />
          )}
          <ActionButton onClick={handleRefresh} loading={actionLoading === "refresh"}>
            Refresh
          </ActionButton>
        </div>
      </div>

      {error && (
        <div className="rounded border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-2 font-mono text-xs text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Top row: Crawler status + Controls */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Crawler Status */}
        <Card className="lg:col-span-2 animate-slide-up stagger-1">
          <CardHeader>
            <CardTitle>Match Crawler</CardTitle>
            <div className="ml-auto flex items-center gap-3">
              {crawler && (
                <>
                  <StatusDot
                    active={crawler.enabled && !crawler.kill_switch_active}
                    color={
                      crawler.kill_switch_active
                        ? "danger"
                        : crawler.enabled
                          ? "success"
                          : "muted"
                    }
                    label={
                      crawler.kill_switch_active
                        ? "Killed"
                        : crawler.circuit_breaker_active
                          ? "Circuit break"
                          : crawler.enabled
                            ? "Running"
                            : "Disabled"
                    }
                  />
                </>
              )}
            </div>
          </CardHeader>

          {crawler ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat
                  label="Queue Depth"
                  value={crawler.queue_depth.toLocaleString()}
                  mono
                  accent
                />
                <Stat
                  label="Players Seen"
                  value={crawler.seen_count.toLocaleString()}
                  mono
                />
                <Stat
                  label="Matches Inserted"
                  value={crawler.stats.matches_inserted.toLocaleString()}
                  mono
                />
                <Stat
                  label="Cycles Run"
                  value={crawler.stats.cycles.toLocaleString()}
                  mono
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat
                  label="Players Processed"
                  value={crawler.stats.players_processed.toLocaleString()}
                  mono
                />
                <Stat
                  label="Last Run"
                  value={
                    crawler.stats.last_run_at
                      ? new Date(
                          Number(crawler.stats.last_run_at) * 1000
                        ).toLocaleString()
                      : "Never"
                  }
                />
                <Stat
                  label="Est. Matches/Day"
                  value={
                    crawler.stats.cycles > 0
                      ? Math.round(
                          (crawler.stats.matches_inserted /
                            crawler.stats.cycles) *
                            12
                        ).toLocaleString()
                      : "—"
                  }
                  mono
                />
              </div>

              {/* Guard status */}
              <div className="flex flex-wrap gap-3 rounded border border-[var(--color-border)] bg-[var(--background)] px-4 py-3">
                <StatusDot
                  active={!crawler.kill_switch_active}
                  color={crawler.kill_switch_active ? "danger" : "success"}
                  label={
                    crawler.kill_switch_active
                      ? "Kill switch ON"
                      : "Kill switch off"
                  }
                />
                <StatusDot
                  active={!crawler.circuit_breaker_active}
                  color={crawler.circuit_breaker_active ? "warning" : "success"}
                  label={
                    crawler.circuit_breaker_active
                      ? "Circuit breaker TRIPPED"
                      : "Circuit breaker clear"
                  }
                />
                <StatusDot
                  active={crawler.enabled}
                  color={crawler.enabled ? "success" : "muted"}
                  label={crawler.enabled ? "Enabled in config" : "Disabled in config"}
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center font-mono text-xs text-[var(--color-text-muted)]">
              Could not load crawler status
            </div>
          )}
        </Card>

        {/* Controls */}
        <Card className="animate-slide-up stagger-2">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                Emergency Stop
              </div>
              <ActionButton
                onClick={handleKillSwitch}
                variant={crawler?.kill_switch_active ? "success" : "danger"}
                loading={actionLoading === "kill"}
              >
                {crawler?.kill_switch_active
                  ? "Deactivate Kill Switch"
                  : "Activate Kill Switch"}
              </ActionButton>
              <p className="text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                {crawler?.kill_switch_active
                  ? "Crawler is halted. Click to resume."
                  : "Immediately stops the crawler. Stays active until cleared."}
              </p>
            </div>

            <div className="border-t border-[var(--color-border)] pt-3">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Seed Queue
                </div>
                <ActionButton
                  onClick={handleSeed}
                  loading={actionLoading === "seed"}
                  disabled={crawler?.kill_switch_active}
                >
                  Seed from Ladder
                </ActionButton>
                <p className="text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                  Fetch Challenger + Grandmaster players and add to crawl queue.
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-3">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Schedule
                </div>
                <p className="font-mono text-xs text-[var(--color-text-secondary)]">
                  Every 2h at :30
                </p>
                <p className="text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                  Cron job runs automatically when CRAWLER_ENABLED=true.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row: Quota + DB stats + Activity log */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Riot API Quota */}
        <Card className="animate-slide-up stagger-3">
          <CardHeader>
            <CardTitle>Riot API Quota</CardTitle>
            {quota?.auto_backoff_active && (
              <span className="ml-auto rounded bg-[var(--color-warning)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                Backoff active
              </span>
            )}
          </CardHeader>
          {quota ? (
            <div className="space-y-4">
              <QuotaBar label="Per second" pct={quota.per_second_used_pct} />
              <QuotaBar label="Per 2 min" pct={quota.per_2min_used_pct} />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Stat
                  label="Limit /s"
                  value={quota.per_second_limit}
                  mono
                />
                <Stat
                  label="Limit /2min"
                  value={quota.per_2min_limit}
                  mono
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center font-mono text-xs text-[var(--color-text-muted)]">
              Auth required
            </div>
          )}
        </Card>

        {/* Database Stats */}
        <Card className="animate-slide-up stagger-4">
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          {dbStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Unique Matches"
                  value={dbStats.unique_matches.toLocaleString()}
                  mono
                  accent
                />
                <Stat
                  label="Unique Players"
                  value={dbStats.unique_players.toLocaleString()}
                  mono
                />
                <Stat
                  label="Total Rows"
                  value={dbStats.total_rows.toLocaleString()}
                  mono
                />
                <Stat
                  label="Storage"
                  value={`${dbStats.storage_mb} MB`}
                  mono
                />
              </div>
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Matches / Day (14d)
                </div>
                <IngestionChart days={dbStats.recent_days} />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center font-mono text-xs text-[var(--color-text-muted)]">
              No data
            </div>
          )}
        </Card>

        {/* Activity Log */}
        <Card className="animate-slide-up stagger-5">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">
              {logs.length} entries
            </span>
          </CardHeader>
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-[var(--color-text-muted)]">
                No activity yet
              </div>
            ) : (
              logs.map((log, i) => (
                <LogEntry key={i} message={log.message} time={log.time} />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
