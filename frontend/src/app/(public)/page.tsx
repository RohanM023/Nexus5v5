"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRecentSearches, type RecentSearch } from "@/lib/recent-searches";

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

export default function Home() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [region, setRegion] = useState("na1");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

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
      router.push(
        `/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      );
    } else {
      alert("Please enter a Riot ID in the format: GameName#TAG");
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
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

        {recentSearches.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 animate-fade-in stagger-2">
            <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-text-muted)]">
              Recent
            </span>
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
            <svg
              className="h-3.5 w-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-text)] transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
