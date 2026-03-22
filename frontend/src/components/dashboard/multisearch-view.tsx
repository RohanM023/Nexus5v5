"use client";

export function MultisearchView() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <p className="text-xs font-medium text-[var(--color-text-primary)]">Multisearch</p>
      <p className="max-w-sm text-center text-[10px] text-[var(--color-text-muted)]">
        Paste multiple summoner names to compare champion pools and find team
        synergies.
      </p>
      <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
        Coming Soon
      </span>
    </div>
  );
}
