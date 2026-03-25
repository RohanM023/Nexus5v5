import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-4">
      <p className="font-mono text-6xl font-bold text-[var(--color-text-muted)]/30">
        404
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Page not found
      </p>
      <Link
        href="/"
        className="mt-2 font-mono text-xs tracking-wider text-[var(--color-accent-text)] transition-colors hover:text-[var(--color-accent-hover)]"
      >
        Return home
      </Link>
    </div>
  );
}
