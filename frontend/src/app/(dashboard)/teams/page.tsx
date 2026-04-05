"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// 2026 Clash schedule — approximate dates based on Riot's historical cadence
const CLASH_WEEKENDS = [
  { id: "jan-1", label: "January Tournament I", dates: ["Jan 17", "Jan 18"], month: "January" },
  { id: "jan-2", label: "January Tournament II", dates: ["Jan 31", "Feb 1"], month: "January" },
  { id: "feb-1", label: "February Tournament I", dates: ["Feb 14", "Feb 15"], month: "February" },
  { id: "feb-2", label: "February Tournament II", dates: ["Feb 28", "Mar 1"], month: "February" },
  { id: "mar-1", label: "March Tournament I", dates: ["Mar 14", "Mar 15"], month: "March" },
  { id: "mar-2", label: "March Tournament II", dates: ["Mar 28", "Mar 29"], month: "March" },
  { id: "apr-1", label: "April Tournament I", dates: ["Apr 11", "Apr 12"], month: "April" },
  { id: "apr-2", label: "April Tournament II", dates: ["Apr 25", "Apr 26"], month: "April" },
  { id: "may-1", label: "May Tournament I", dates: ["May 9", "May 10"], month: "May" },
  { id: "may-2", label: "May Tournament II", dates: ["May 23", "May 24"], month: "May" },
  { id: "jun-1", label: "June Tournament I", dates: ["Jun 6", "Jun 7"], month: "June" },
  { id: "jun-2", label: "June Tournament II", dates: ["Jun 20", "Jun 21"], month: "June" },
];

const SLOT_LABELS = ["Top", "Jungle", "Mid", "Bot", "Support"] as const;

interface Teammate {
  id: string;
  name: string;
  riotId: string;
}

interface Availability {
  [weekendId: string]: {
    [teammateId: string]: boolean;
  };
}

const STORAGE_KEY_TEAM = "lynkr-clash-team";
const STORAGE_KEY_AVAIL = "lynkr-clash-availability";

function isPast(dates: string[]): boolean {
  const last = dates[dates.length - 1];
  const d = new Date(`${last}, 2026`);
  return d < new Date();
}

export default function TeamsPage() {
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [availability, setAvailability] = useState<Availability>({});
  const [addName, setAddName] = useState("");
  const [addRiotId, setAddRiotId] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("All");

  useEffect(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEY_TEAM);
      if (t) setTeammates(JSON.parse(t));
      const a = localStorage.getItem(STORAGE_KEY_AVAIL);
      if (a) setAvailability(JSON.parse(a));
    } catch {}
  }, []);

  const saveTeam = (team: Teammate[]) => {
    setTeammates(team);
    localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(team));
  };

  const saveAvail = (avail: Availability) => {
    setAvailability(avail);
    localStorage.setItem(STORAGE_KEY_AVAIL, JSON.stringify(avail));
  };

  const addTeammate = () => {
    if (!addName.trim() || teammates.length >= 5) return;
    const t: Teammate = { id: crypto.randomUUID(), name: addName.trim(), riotId: addRiotId.trim() };
    saveTeam([...teammates, t]);
    setAddName("");
    setAddRiotId("");
  };

  const removeTeammate = (id: string) => {
    saveTeam(teammates.filter((t) => t.id !== id));
    const next = { ...availability };
    for (const wknd of CLASH_WEEKENDS) {
      if (next[wknd.id]) delete next[wknd.id][id];
    }
    saveAvail(next);
  };

  const toggleAvail = (weekendId: string, teammateId: string) => {
    const next = {
      ...availability,
      [weekendId]: {
        ...(availability[weekendId] ?? {}),
        [teammateId]: !(availability[weekendId]?.[teammateId] ?? false),
      },
    };
    saveAvail(next);
  };

  const getAvailCount = (weekendId: string) =>
    teammates.filter((t) => availability[weekendId]?.[t.id]).length;

  const allAvailable = (weekendId: string) =>
    teammates.length > 0 && teammates.every((t) => availability[weekendId]?.[t.id]);

  const months = ["All", ...Array.from(new Set(CLASH_WEEKENDS.map((w) => w.month)))];
  const filtered = CLASH_WEEKENDS.filter((w) => filterMonth === "All" || w.month === filterMonth);
  const upcomingFull = CLASH_WEEKENDS.filter((w) => !isPast(w.dates) && allAvailable(w.id));

  const inputClass =
    "rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none transition-colors";

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Clash Calendar</h1>
        <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
          Track your team's availability across Clash weekends · 2026
        </p>
      </div>

      {upcomingFull.length > 0 && (
        <div className="rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] px-4 py-3">
          <p className="text-[10px] font-medium text-[var(--color-success)]">
            Full team free for {upcomingFull.length} upcoming weekend{upcomingFull.length !== 1 ? "s" : ""}:
          </p>
          <p className="mt-1 font-mono text-[9px] text-[var(--color-success)]/70">
            {upcomingFull.map((w) => w.dates.join(" & ")).join(" · ")}
          </p>
        </div>
      )}

      {/* Roster builder */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
        <h2 className="font-mono text-[10px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">
          Your Roster ({teammates.length}/5)
        </h2>

        <div className="space-y-2">
          {SLOT_LABELS.map((slot, idx) => {
            const teammate = teammates[idx];
            return (
              <div key={slot} className="flex items-center gap-3">
                <span className="w-14 font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">{slot}</span>
                {teammate ? (
                  <div className="flex flex-1 items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2">
                    <div>
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{teammate.name}</span>
                      {teammate.riotId && (
                        <span className="ml-2 font-mono text-[9px] text-[var(--color-text-muted)]">{teammate.riotId}</span>
                      )}
                    </div>
                    <button onClick={() => removeTeammate(teammate.id)}
                      className="text-[10px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-danger)]">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 rounded-md border border-dashed border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-text-muted)]">
                    Empty slot
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {teammates.length < 5 && (
          <div className="flex gap-2 border-t border-[var(--color-border)] pt-4">
            <input className={cn(inputClass, "flex-1")} placeholder="Name"
              value={addName} onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeammate()} />
            <input className={cn(inputClass, "w-36")} placeholder="Riot ID (opt)"
              value={addRiotId} onChange={(e) => setAddRiotId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeammate()} />
            <button onClick={addTeammate} disabled={!addName.trim()}
              className={cn(
                "rounded-md px-4 py-2 text-[10px] font-medium tracking-widest uppercase transition-colors",
                addName.trim()
                  ? "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
                  : "cursor-not-allowed bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
              )}>
              Add
            </button>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Month</span>
          {months.map((m) => (
            <button key={m} onClick={() => setFilterMonth(m)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors",
                filterMonth === m
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}>{m}</button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((weekend) => {
            const past = isPast(weekend.dates);
            const count = getAvailCount(weekend.id);
            const full = allAvailable(weekend.id);

            return (
              <div key={weekend.id}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  past ? "border-[var(--color-border)] opacity-40" :
                  full ? "border-[var(--color-success)]/40 bg-[var(--color-success-bg)]" :
                  count >= 3 ? "border-[var(--color-warning-bg)] bg-[var(--color-warning-bg)]/30" :
                  "border-[var(--color-border)] bg-[var(--color-surface)]"
                )}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{weekend.label}</p>
                    <p className="mt-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                      {weekend.dates.join(" · ")}{past && " — Past"}
                    </p>
                  </div>
                  {!past && teammates.length > 0 && (
                    <span className={cn(
                      "font-mono text-sm font-bold shrink-0",
                      full ? "text-[var(--color-success)]" :
                      count >= 3 ? "text-[var(--color-warning)]" :
                      "text-[var(--color-text-muted)]"
                    )}>
                      {count}/{teammates.length}
                    </span>
                  )}
                </div>

                {teammates.length > 0 && !past && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {teammates.map((t) => {
                      const avail = availability[weekend.id]?.[t.id] ?? false;
                      return (
                        <button key={t.id} onClick={() => toggleAvail(weekend.id, t.id)}
                          className={cn(
                            "rounded px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors",
                            avail
                              ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                              : "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                          )}>
                          {avail ? "✓ " : ""}{t.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {teammates.length === 0 && !past && (
                  <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                    Add teammates above to track availability.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
