import Link from "next/link";
import { LegalFooter } from "@/components/ui/legal-footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-5 top-5 flex items-center gap-2 rounded px-2 py-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
        title="Back to home"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="font-mono text-[10px] tracking-wider">Home</span>
      </Link>

      <div className="mb-10">
        <Link href="/" className="flex flex-col items-center gap-1">
          <span className="font-mono text-xl font-bold tracking-[0.2em] uppercase text-[var(--color-text-primary)]">
            Nexus
          </span>
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-[var(--color-text-muted)]">
            5v5
          </span>
        </Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <LegalFooter />
    </div>
  );
}
