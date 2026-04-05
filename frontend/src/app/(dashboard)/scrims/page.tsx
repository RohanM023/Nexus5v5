"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

const RANKS = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master+"] as const;
const FORMATS = ["Best of 1", "Best of 3", "Best of 5"] as const;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIMES = ["Morning", "Afternoon", "Evening", "Late Night"] as const;

interface ScrimListing {
  id: string;
  teamName: string;
  contactRiotId: string;
  discord: string;
  rankRange: string;
  formats: string[];
  availability: string[];
  notes: string;
  postedAt: string;
}

const MOCK_SCRIMS: ScrimListing[] = [
  {
    id: "mock-1",
    teamName: "Cloud9 Academy",
    contactRiotId: "C9 Zven#NA1",
    discord: "c9scrims#1234",
    rankRange: "Diamond",
    formats: ["Best of 3"],
    availability: ["Saturday", "Sunday", "Evening"],
    notes: "Looking for structured scrims. VOD review welcome. Positive environment only.",
    postedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "mock-2",
    teamName: "Team Liquid Reserve",
    contactRiotId: "TL Scrims#NA1",
    discord: "tlreserve#5678",
    rankRange: "Platinum",
    formats: ["Best of 1", "Best of 3"],
    availability: ["Friday", "Saturday", "Evening", "Late Night"],
    notes: "New team, LF scrims to improve draft. Any rank welcome as long as attitude is good.",
    postedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
  {
    id: "mock-3",
    teamName: "Immortals Tryouts",
    contactRiotId: "IMT Scout#NA1",
    discord: "imtscrims#9012",
    rankRange: "Emerald",
    formats: ["Best of 3", "Best of 5"],
    availability: ["Wednesday", "Thursday", "Saturday", "Evening"],
    notes: "Serious team, serious scrims. Fearless format preferred. No raging.",
    postedAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  },
];

const STORAGE_KEY = "lynkr-scrim-listings";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ScrimsPage() {
  const { user, isAuthenticated } = useAuth();
  const [userListings, setUserListings] = useState<ScrimListing[]>([]);
  const [myListingId, setMyListingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterRank, setFilterRank] = useState<string>("All");

  // Form state
  const [teamName, setTeamName] = useState("");
  const [contactRiotId, setContactRiotId] = useState("");
  const [discord, setDiscord] = useState("");
  const [rankRange, setRankRange] = useState("");
  const [formats, setFormats] = useState<string[]>(["Best of 3"]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUserListings(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleFormat = (f: string) =>
    setFormats((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const toggleAvailability = (a: string) =>
    setAvailability((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handlePost = () => {
    if (!teamName.trim() || !contactRiotId.trim() || !rankRange) return;
    const listing: ScrimListing = {
      id: crypto.randomUUID(),
      teamName: teamName.trim(),
      contactRiotId: contactRiotId.trim(),
      discord: discord.trim(),
      rankRange,
      formats,
      availability,
      notes: notes.trim(),
      postedAt: new Date().toISOString(),
    };
    const updated = [listing, ...userListings.filter((l) => l.id !== myListingId)];
    setUserListings(updated);
    setMyListingId(listing.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowForm(false);
  };

  const handleRemove = () => {
    if (!myListingId) return;
    const updated = userListings.filter((l) => l.id !== myListingId);
    setUserListings(updated);
    setMyListingId(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const allListings = [...userListings, ...MOCK_SCRIMS];
  const filtered = filterRank === "All" ? allListings : allListings.filter((l) => l.rankRange === filterRank);

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none transition-colors";

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Scrim Organizer</h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            Find teams to practice against before Clash
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => isAuthenticated && setShowForm(true)}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? "Sign in to post" : undefined}
            className={cn(
              "rounded-md px-4 py-2 text-[10px] font-medium tracking-widest uppercase transition-colors",
              isAuthenticated
                ? "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
                : "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            )}
          >
            {myListingId ? "Update Listing" : "+ Post Team"}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="border-l-2 border-amber-600/50 bg-amber-600/5 px-4 py-2 text-xs text-amber-400">
          <Link href="/login" className="underline hover:text-amber-300">Sign in</Link>{" "}
          to post your team for scrims.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[10px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">
              Your Team
            </h2>
            <button onClick={() => setShowForm(false)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Team Name</label>
              <input className={inputClass} placeholder="e.g. Team Lynkr" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Contact Riot ID</label>
              <input className={inputClass} placeholder="Name#TAG" value={contactRiotId} onChange={(e) => setContactRiotId(e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Discord</label>
              <input className={inputClass} placeholder="server invite or username" value={discord} onChange={(e) => setDiscord(e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Avg Rank</label>
              <select className={inputClass} value={rankRange} onChange={(e) => setRankRange(e.target.value)}>
                <option value="">Select rank...</option>
                {RANKS.map((r) => <option key={r} value={r} className="bg-[var(--color-surface)]">{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Format</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button key={f} type="button" onClick={() => toggleFormat(f)}
                  className={cn(
                    "rounded border px-3 py-1.5 font-mono text-[10px] tracking-wider transition-colors",
                    formats.includes(f)
                      ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                  )}
                >{f}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Availability</label>
            <div className="flex flex-wrap gap-2">
              {[...DAYS, ...TIMES].map((a) => (
                <button key={a} type="button" onClick={() => toggleAvailability(a)}
                  className={cn(
                    "rounded border px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors",
                    availability.includes(a)
                      ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                  )}
                >{a}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Notes</label>
            <textarea className={cn(inputClass, "resize-none")} rows={3}
              placeholder="Preferred format, comp style, rules..."
              value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={280}
            />
          </div>

          <button onClick={handlePost}
            disabled={!teamName.trim() || !contactRiotId.trim() || !rankRange}
            className={cn(
              "w-full rounded-md py-2.5 text-[10px] font-medium tracking-widest uppercase transition-colors",
              !teamName.trim() || !contactRiotId.trim() || !rankRange
                ? "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                : "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
            )}
          >
            Post Team
          </button>
        </div>
      )}

      {/* Active listing banner */}
      {myListingId && !showForm && (
        <div className="flex items-center justify-between rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] px-4 py-2.5">
          <p className="text-[10px] text-[var(--color-success)]">Your team is listed — other teams can see you.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(true)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Edit</button>
            <button onClick={handleRemove} className="text-[10px] text-[var(--color-danger)] hover:text-[var(--color-danger)]/80">Remove</button>
          </div>
        </div>
      )}

      {/* Browse */}
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Rank</span>
          {["All", ...RANKS].map((r) => (
            <button key={r} onClick={() => setFilterRank(r)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors",
                filterRank === r
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >{r}</button>
          ))}
          <span className="ml-auto font-mono text-[9px] text-[var(--color-text-muted)]">
            {filtered.length} team{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">No teams listed for this rank.</div>
          )}
          {filtered.map((listing) => (
            <div key={listing.id}
              className={cn(
                "border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors",
                listing.id === myListingId && "border-l-2 border-l-[var(--color-accent)]/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{listing.teamName}</span>
                    {listing.id === myListingId && (
                      <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-accent-text)]">You</span>
                    )}
                    <span className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[9px]",
                      listing.rankRange === "Diamond" || listing.rankRange === "Master+" ? "bg-[var(--color-tier-a-bg)] text-[var(--color-tier-a)]" :
                      listing.rankRange === "Emerald" || listing.rankRange === "Platinum" ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" :
                      "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                    )}>
                      {listing.rankRange}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">{listing.contactRiotId}</p>
                </div>
                <span className="font-mono text-[9px] text-[var(--color-text-muted)] shrink-0">{timeAgo(listing.postedAt)}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {listing.formats.map((f) => (
                  <span key={f} className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">{f}</span>
                ))}
                {listing.availability.map((a) => (
                  <span key={a} className="rounded bg-[var(--color-accent)]/5 px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-accent-text)]/60">{a}</span>
                ))}
              </div>

              {listing.notes && (
                <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{listing.notes}</p>
              )}

              {listing.discord && (
                <p className="mt-1.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                  Discord: <span className="text-[var(--color-text-secondary)]">{listing.discord}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
