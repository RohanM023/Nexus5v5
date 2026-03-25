"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-danger)]/10">
        <svg
          className="h-5 w-5 text-[var(--color-danger)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Something went wrong
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-[var(--color-surface-hover)] px-4 py-1.5 text-xs tracking-wider uppercase text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        Try again
      </button>
      <Link
        href="/"
        className="font-mono text-xs tracking-wider text-[var(--color-accent-text)] transition-colors hover:text-[var(--color-accent-hover)]"
      >
        Return home
      </Link>
    </div>
  );
}
