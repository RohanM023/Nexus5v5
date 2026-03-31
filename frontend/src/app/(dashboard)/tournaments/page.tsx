"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

type TournamentStatus = "upcoming" | "active" | "completed";
type TournamentFormat = "single-elim" | "double-elim" | "round-robin" | "swiss";

interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  format: TournamentFormat;
  teamSize: number;
  maxTeams: number;
  registeredTeams: number;
  startDate: string;
  prizeDescription: string;
  organizer: string;
}

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  "single-elim": "Single Elimination",
  "double-elim": "Double Elimination",
  "round-robin": "Round Robin",
  "swiss": "Swiss",
};

const STATUS_STYLES: Record<TournamentStatus, { dot: string; label: string }> = {
  upcoming: { dot: "bg-[var(--color-warning)]", label: "Upcoming" },
  active: { dot: "bg-[var(--color-success)]", label: "Live" },
  completed: { dot: "bg-[var(--color-text-muted)]", label: "Completed" },
};

// Placeholder data — will be replaced with API calls
const SAMPLE_TOURNAMENTS: Tournament[] = [
  {
    id: "1",
    name: "Nexus Weekly #1",
    status: "upcoming",
    format: "single-elim",
    teamSize: 5,
    maxTeams: 16,
    registeredTeams: 7,
    startDate: "2026-04-05T20:00:00Z",
    prizeDescription: "Bragging rights",
    organizer: "Nexus 5v5",
  },
  {
    id: "2",
    name: "Community Clash Open",
    status: "upcoming",
    format: "double-elim",
    teamSize: 5,
    maxTeams: 32,
    registeredTeams: 18,
    startDate: "2026-04-12T18:00:00Z",
    prizeDescription: "RP prizes for top 3",
    organizer: "Nexus 5v5",
  },
  {
    id: "3",
    name: "Draft Kings Invitational",
    status: "upcoming",
    format: "swiss",
    teamSize: 5,
    maxTeams: 8,
    registeredTeams: 8,
    startDate: "2026-04-19T21:00:00Z",
    prizeDescription: "Invite only",
    organizer: "Nexus 5v5",
  },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const status = STATUS_STYLES[tournament.status];
  const spotsLeft = tournament.maxTeams - tournament.registeredTeams;
  const fillPct = (tournament.registeredTeams / tournament.maxTeams) * 100;

  return (
    <div className="group rounded-md border border-[var(--color-border)]/40 bg-[var(--color-surface)]/50 p-5 transition-all hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {tournament.name}
            </h3>
            <span className="flex items-center gap-1 shrink-0">
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
              <span className="font-mono text-[9px] tracking-wider text-[var(--color-text-muted)]">
                {status.label}
              </span>
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            {formatDate(tournament.startDate)}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={spotsLeft === 0}>
          {spotsLeft === 0 ? "Full" : "Register"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
            Format
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {FORMAT_LABELS[tournament.format]}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
            Team Size
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {tournament.teamSize}v{tournament.teamSize}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
            Prize
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {tournament.prizeDescription}
          </p>
        </div>
      </div>

      {/* Registration bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-wider text-[var(--color-text-muted)]">
            {tournament.registeredTeams}/{tournament.maxTeams} teams
          </span>
          {spotsLeft > 0 ? (
            <span className="font-mono text-[9px] tracking-wider text-[var(--color-accent-text)]">
              {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
            </span>
          ) : (
            <span className="font-mono text-[9px] tracking-wider text-[var(--color-danger)]">
              Full
            </span>
          )}
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              fillPct >= 100
                ? "bg-[var(--color-danger)]"
                : fillPct >= 75
                  ? "bg-[var(--color-warning)]"
                  : "bg-[var(--color-accent)]"
            )}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

type TabFilter = "all" | "upcoming" | "active" | "completed";

export default function TournamentsPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showCreate, setShowCreate] = useState(false);

  const tabs: { value: TabFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Past" },
  ];

  const filtered =
    activeTab === "all"
      ? SAMPLE_TOURNAMENTS
      : SAMPLE_TOURNAMENTS.filter((t) => t.status === activeTab);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {!isAuthenticated && (
        <div className="border-l-2 border-amber-600/50 bg-amber-600/5 px-4 py-2 text-xs text-amber-400">
          Sign in to register for tournaments and manage your team.{" "}
          <Link href="/login" className="underline hover:text-amber-300">
            Sign In
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            Tournaments
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Community 5v5 tournaments — register your team and compete.
          </p>
        </div>
        {isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? "Cancel" : "Create Tournament"}
          </Button>
        )}
      </div>

      {/* Create tournament form */}
      {showCreate && (
        <div className="space-y-4 rounded-md border border-[var(--color-border)]/40 bg-[var(--color-surface)]/50 p-5">
          <p className="font-mono text-[10px] font-medium tracking-wider uppercase text-[var(--color-text-muted)]">
            New Tournament
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Tournament Name
              </label>
              <input
                type="text"
                placeholder="e.g. Friday Night Clash"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)]/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Format
              </label>
              <select className="w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)]/40 focus:outline-none">
                <option value="single-elim">Single Elimination</option>
                <option value="double-elim">Double Elimination</option>
                <option value="round-robin">Round Robin</option>
                <option value="swiss">Swiss</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Max Teams
              </label>
              <select className="w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)]/40 focus:outline-none">
                <option value="8">8 teams</option>
                <option value="16">16 teams</option>
                <option value="32">32 teams</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
              Description (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Rules, prize info, or any other details..."
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" disabled>
              Create (Coming Soon)
            </Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]/40 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "relative px-3 py-2 font-mono text-[10px] tracking-wider transition-colors",
              activeTab === tab.value
                ? "text-[var(--color-accent-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--color-accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tournament list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2">
            <p className="text-xs text-[var(--color-text-muted)]">No tournaments found</p>
            <p className="font-mono text-[9px] tracking-wider text-[var(--color-text-muted)]">
              Check back soon or create your own
            </p>
          </div>
        ) : (
          filtered.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))
        )}
      </div>

      {/* Info footer */}
      <div className="rounded-md border border-[var(--color-border)]/20 bg-[var(--color-surface)]/30 px-4 py-3">
        <p className="font-mono text-[9px] leading-relaxed tracking-wider text-[var(--color-text-muted)]">
          Tournaments are free to enter. All participants must have a linked Riot account.
          Minimum 20 participants required per Riot Tournaments API policy.
          Traditional bracket formats only (elimination, round robin, swiss).
        </p>
      </div>
    </div>
  );
}
