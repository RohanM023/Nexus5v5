"use client";

import Link from "next/link";

export function SoloQueueView() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <p className="text-xs font-medium text-[var(--color-text-primary)]">Solo Queue Lookup</p>
      <p className="max-w-sm text-center text-[10px] text-[var(--color-text-muted)]">
        Search for any summoner to view their ranked stats, champion pool, and
        match history.
      </p>
      <Link
        href="/"
        className="rounded-md bg-[var(--color-accent-bg)] px-5 py-2 text-xs font-medium text-black transition-colors hover:bg-[var(--color-accent-bg-hover)]"
      >
        Search
      </Link>
    </div>
  );
}
