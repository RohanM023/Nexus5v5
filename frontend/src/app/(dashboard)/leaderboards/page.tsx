"use client";

export default function LeaderboardsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight text-white">Leaderboards</h1>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Top players ranked by True Mastery scores
        </p>
      </div>

      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Coming soon
        </p>
        <p className="font-mono text-[9px] tracking-wider text-[var(--color-text-muted)]">
          Rankings will populate once enough match data is ingested
        </p>
      </div>
    </div>
  );
}
