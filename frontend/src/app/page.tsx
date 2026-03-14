"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="flex min-h-screen flex-col bg-[#0a0e1a]">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              N
            </div>
            <span className="text-lg font-bold text-white">Nexus 5v5</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
          AI-Powered Draft Intelligence
        </div>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          Dominate Clash with{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Smarter Drafts
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
          Search any summoner, analyze champion pools, and get real-time
          synergy and counter scoring during champion select.
        </p>

        <form onSubmit={handleSearch} className="mt-10 w-full max-w-2xl">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search summoner... (e.g., Faker#KR1)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-base text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:w-32"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500"
            >
              Search
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Or{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              sign in
            </Link>{" "}
            to link your accounts and unlock personalized features
          </p>
        </form>

        <div className="mt-24 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <FeatureCard
            title="Identity Aggregation"
            description="Link all your Riot accounts into one Master Profile with unified stats."
          />
          <FeatureCard
            title="Draft Intelligence"
            description="Real-time synergy, counter, and comfort scoring during champion select."
          />
          <FeatureCard
            title="True Mastery"
            description="Go beyond Mastery Points with data-driven champion proficiency scores."
          />
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        Nexus 5v5 &middot; Not endorsed by Riot Games
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left backdrop-blur-sm">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}
