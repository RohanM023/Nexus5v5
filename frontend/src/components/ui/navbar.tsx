"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { ThemePicker } from "@/components/ui/theme-picker";

const REGIONS = [
  { value: "na1", label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
  { value: "oc1", label: "OCE" },
  { value: "tr1", label: "TR" },
  { value: "ru", label: "RU" },
  { value: "jp1", label: "JP" },
] as const;

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [region, setRegion] = useState("na1");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const parts = trimmed.split("#");
    if (parts.length === 2) {
      const [gameName, tagLine] = parts;
      router.push(`/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      setSearchInput("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 font-mono text-xs font-bold tracking-widest uppercase text-[var(--color-accent-text)]">
          Nexus
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <Link
            href="/dashboard"
            className="px-3 py-1 text-xs tracking-wide text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Clash
          </Link>
          <Link
            href="/draft"
            className="px-3 py-1 text-xs tracking-wide text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Draft
          </Link>
          <Link
            href="/duo-compare"
            className="px-3 py-1 text-xs tracking-wide text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Duo
          </Link>
          <Link
            href="/tournaments"
            className="px-3 py-1 text-xs tracking-wide text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Tourneys
          </Link>
        </div>

        <form onSubmit={handleSearch} className="mx-4 flex min-w-0 flex-1 items-center justify-center">
          <div className="flex w-full max-w-sm items-center rounded-md border border-[var(--color-border)] px-2 transition-colors focus-within:border-[var(--color-accent)]/50">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-7 bg-transparent pr-1 font-mono text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] focus:outline-none"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value} className="bg-[var(--color-surface)]">
                  {r.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search Riot ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-7 min-w-0 flex-1 bg-transparent px-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-4">
          <ThemePicker />
          {isAuthenticated ? (
            <>
              <span className="hidden font-mono text-[10px] tracking-wider text-[var(--color-text-muted)] sm:block">
                {user?.display_name}
              </span>
              <button
                onClick={signOut}
                className="text-[10px] tracking-wider uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-[10px] tracking-wider uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
