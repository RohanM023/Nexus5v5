"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

type TournamentFormat = "single-elim" | "double-elim" | "round-robin" | "swiss";

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  "single-elim": "Single Elimination",
  "double-elim": "Double Elimination",
  "round-robin": "Round Robin",
  "swiss": "Swiss",
};

interface CreateForm {
  name: string;
  startDate: string;
  format: TournamentFormat;
  maxTeams: string;
  description: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  startDate: "",
  format: "single-elim",
  maxTeams: "16",
  description: "",
};

export default function TournamentsPage() {
  const { isAuthenticated } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const updateField = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  };

  const handleCreate = () => {
    if (!form.name.trim()) {
      setFormError("Tournament name is required.");
      return;
    }
    if (!form.startDate) {
      setFormError("Start date is required.");
      return;
    }
    const startMs = new Date(form.startDate).getTime();
    if (startMs <= Date.now()) {
      setFormError("Start date must be in the future.");
      return;
    }
    // Backend tournament API not yet implemented — show confirmation
    setFormError(null);
    setForm(EMPTY_FORM);
    setShowCreate(false);
  };

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {!isAuthenticated && (
        <div className="border-l-2 border-amber-600/50 bg-amber-600/5 px-4 py-2 text-xs text-amber-400">
          Sign in to create and register for tournaments.{" "}
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
            Community 5v5 tournaments — create, register, and compete.
          </p>
        </div>
        {isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCreate(!showCreate);
              setFormError(null);
              if (showCreate) setForm(EMPTY_FORM);
            }}
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

          {formError && (
            <div className="rounded border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2 font-mono text-[11px] text-[var(--color-danger)]">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Tournament Name
              </label>
              <input
                type="text"
                placeholder="e.g. Friday Night Clash"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Format
              </label>
              <select
                value={form.format}
                onChange={(e) => updateField("format", e.target.value as TournamentFormat)}
                className={inputClass}
              >
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
                Max Teams
              </label>
              <select
                value={form.maxTeams}
                onChange={(e) => updateField("maxTeams", e.target.value)}
                className={inputClass}
              >
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
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className={cn(inputClass, "resize-none")}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Requires Riot Tournaments API access.
            </p>
            <Button size="sm" onClick={handleCreate}>
              Create Tournament
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-md border border-dashed border-[var(--color-border)]/40 bg-[var(--color-surface)]/20 px-6 py-12">
        <svg className="h-10 w-10 text-[var(--color-text-muted)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No tournaments yet
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--color-text-muted)]">
            Organizers with tournament access can create events for the community.
          </p>
        </div>
        {isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            Create Tournament
          </Button>
        )}
      </div>

      {/* Info footer */}
      <div className="rounded-md border border-[var(--color-border)]/20 bg-[var(--color-surface)]/30 px-4 py-3">
        <p className="font-mono text-[9px] leading-relaxed tracking-wider text-[var(--color-text-muted)]">
          Tournaments are free to enter. All participants must have a linked Riot account.
        </p>
      </div>
    </div>
  );
}
