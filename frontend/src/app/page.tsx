"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRecentSearches, type RecentSearch } from "@/lib/recent-searches";
import { LegalFooter } from "@/components/ui/legal-footer";
import { ThemePicker } from "@/components/ui/theme-picker";
import { cn } from "@/lib/utils";

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

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/draft",
    label: "Draft",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/duo-compare",
    label: "Duo",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Home() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [region, setRegion] = useState("na1");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const parts = trimmed.split("#");
    if (parts.length === 2) {
      const [gameName, tagLine] = parts;
      router.push(`/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
    } else {
      alert("Please enter a Riot ID in the format: GameName#TAG");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* ── Left sidebar rail ── */}
      <div
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full flex-col border-r border-[var(--color-border)]/40 bg-[var(--background)]/90 backdrop-blur-md transition-[width] duration-200",
          sidebarOpen ? "w-40" : "w-11"
        )}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        {/* Toggle chevron */}
        <div className="flex h-14 items-center justify-center">
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            <svg
              className={cn("h-3 w-3 transition-transform duration-200", !sidebarOpen && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded px-2 py-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
                !sidebarOpen && "justify-center px-0"
              )}
              title={!sidebarOpen ? link.label : undefined}
            >
              {link.icon}
              {sidebarOpen && (
                <span className="font-mono text-[10px] font-medium tracking-wider whitespace-nowrap">
                  {link.label}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Version at bottom */}
        {sidebarOpen && (
          <div className="px-4 pb-4">
            <p className="font-mono text-[9px] tracking-wider text-[var(--color-text-muted)]">v0.1.0</p>
          </div>
        )}
      </div>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <span
          className={cn(
            "font-mono text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--color-accent-text)]/60 transition-[margin] duration-200",
            sidebarOpen ? "ml-40" : "ml-11"
          )}
        >
          Nexus 5v5
        </span>
        <div className="flex items-center gap-5">
          <ThemePicker />
          <Link
            href="/dashboard"
            className="text-[10px] tracking-widest uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Clash
          </Link>
          <Link
            href="/draft"
            className="text-[10px] tracking-widest uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Draft
          </Link>
          <Link
            href="/login"
            className="text-[10px] tracking-widest uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* ── Search-centric hero ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-[520px] animate-fade-in">
          <h1 className="mb-12 text-center">
            <span className="block font-mono text-3xl font-bold tracking-[0.2em] uppercase text-[var(--color-text-primary)] sm:text-4xl">
              Nexus
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.5em] uppercase text-[var(--color-text-muted)]">
              Draft Intelligence
            </span>
          </h1>

          <form onSubmit={handleSearch}>
            <div className="flex items-center border-b border-[var(--color-border)] transition-colors focus-within:border-[var(--color-accent)]/60">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-10 bg-transparent pr-2 font-mono text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] focus:outline-none"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[var(--color-surface)]">
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Riot ID (e.g., Faker#KR1)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 flex-1 bg-transparent px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              />
              <button
                type="submit"
                className="h-10 px-4 font-mono text-[10px] font-medium tracking-widest uppercase text-[var(--color-accent-text)] transition-colors hover:text-[var(--color-accent-hover)]"
              >
                Search
              </button>
            </div>
          </form>

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 animate-fade-in stagger-2">
              <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">Recent</span>
              {recentSearches.map((s, i) => (
                <Link
                  key={i}
                  href={`/summoner/${s.region}/${encodeURIComponent(s.gameName)}/${encodeURIComponent(s.tagLine)}`}
                  className="font-mono text-[10px] tracking-wide text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  {s.gameName}#{s.tagLine}
                </Link>
              ))}
            </div>
          )}

          {/* Feature card */}
          <Link
            href="/dashboard"
            className="mt-14 block border-t border-[var(--color-border)] pt-6 transition-colors group animate-fade-in stagger-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-text)] transition-colors">
                  Clash / 5v5 Draft Assistant
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  Build your team, scout opponents, get pick/ban intel
                </p>
              </div>
              <svg className="h-3.5 w-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-text)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
