import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="mb-10">
        <Link href="/" className="flex flex-col items-center gap-1">
          <span className="font-mono text-xl font-bold tracking-[0.2em] uppercase text-white">
            Nexus
          </span>
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-[var(--color-text-muted)]">
            5v5
          </span>
        </Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
