"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ScrimListing } from "@/types";

const RANKS = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master+"] as const;
const FORMATS = ["Best of 1", "Best of 3", "Best of 5"] as const;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIMES = ["Morning", "Afternoon", "Evening", "Late Night"] as const;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ScrimsPage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [filterRank, setFilterRank] = useState<string>("All");

  const [teamName, setTeamName] = useState("");
  const [contactRiotId, setContactRiotId] = useState("");
  const [discord, setDiscord] = useState("");
  const [rankRange, setRankRange] = useState("");
  const [formats, setFormats] = useState<string[]>(["Best of 3"]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["scrim-listings"],
    queryFn: () => api.getScrimListings(),
    refetchInterval: 30_000,
  });

  const upsertMutation = useMutation({
    mutationFn: api.upsertScrimListing.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrim-listings"] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteScrimListing.bind(api),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scrim-listings"] }),
  });

  const myListing = listings.find((l) => l.user_id === user?.id);

  useEffect(() => {
    if (myListing && showForm) {
      setTeamName(myListing.team_name);
      setContactRiotId(myListing.contact_riot_id);
      setDiscord(myListing.discord ?? "");
      setRankRange(myListing.rank_range ?? "");
      setFormats(myListing.formats);
      setAvailability(myListing.availability);
      setNotes(myListing.notes ?? "");
    }
  }, [myListing, showForm]);

  const toggleFormat = (f: string) =>
    setFormats((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const toggleAvailability = (a: string) =>
    setAvailability((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handlePost = () => {
    if (!teamName.trim() || !contactRiotId.trim() || !rankRange) return;
    upsertMutation.mutate({
      team_name: teamName.trim(),
      contact_riot_id: contactRiotId.trim(),
      discord: discord.trim(),
      rank_range: rankRange,
      formats,
      availability,
      notes: notes.trim(),
    });
  };

  const filtered = filterRank === "All" ? listings : listings.filter((l) => l.rank_range === filterRank);

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none transition-colors";

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Scrim Organizer</h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            Find teams to practice against before Clash
          </p>
        </div>
        {!showForm && (
          <button onClick={() => isAuthenticated && setShowForm(true)} disabled={!isAuthenticated}
            title={!isAuthenticated ? "Sign in to post" : undefined}
            className={cn(
              "rounded-md px-4 py-2 text-[10px] font-medium tracking-widest uppercase transition-colors",
              isAuthenticated
                ? "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
                : "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            )}>
            {myListing ? "Update Listing" : "+ Post Team"}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="border-l-2 border-amber-600/50 bg-amber-600/5 px-4 py-2 text-xs text-amber-400">
          <Link href="/login" className="underline hover:text-amber-300">Sign in</Link>{" "}
          to post your team for scrims.
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[10px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">Your Team</h2>
            <button onClick={() => setShowForm(false)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
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
                  )}>{f}</button>
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
                  )}>{a}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Notes</label>
            <textarea className={cn(inputClass, "resize-none")} rows={3}
              placeholder="Preferred format, comp style, rules..."
              value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={280} />
          </div>

          <button onClick={handlePost}
            disabled={!teamName.trim() || !contactRiotId.trim() || !rankRange || upsertMutation.isPending}
            className={cn(
              "w-full rounded-md py-2.5 text-[10px] font-medium tracking-widest uppercase transition-colors",
              !teamName.trim() || !contactRiotId.trim() || !rankRange
                ? "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                : "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
            )}>
            {upsertMutation.isPending ? "Posting..." : "Post Team"}
          </button>
        </div>
      )}

      {myListing && !showForm && (
        <div className="flex items-center justify-between rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] px-4 py-2.5">
          <p className="text-[10px] text-[var(--color-success)]">Your team is listed — visible to all players.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(true)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Edit</button>
            <button onClick={() => deleteMutation.mutate()} className="text-[10px] text-[var(--color-danger)] hover:text-[var(--color-danger)]/80">Remove</button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Rank</span>
          {["All", ...RANKS].map((r) => (
            <button key={r} onClick={() => setFilterRank(r)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors",
                filterRank === r ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}>{r}</button>
          ))}
          <span className="ml-auto font-mono text-[9px] text-[var(--color-text-muted)]">
            {filtered.length} team{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
          {isLoading && <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Loading...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">No teams listed. Post yours to get started.</div>
          )}
          {filtered.map((listing: ScrimListing) => (
            <div key={listing.id}
              className={cn(
                "border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors",
                listing.user_id === user?.id && "border-l-2 border-l-[var(--color-accent)]/50"
              )}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{listing.team_name}</span>
                    {listing.user_id === user?.id && (
                      <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-accent-text)]">You</span>
                    )}
                    {listing.rank_range && (
                      <span className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9px]",
                        listing.rank_range === "Diamond" || listing.rank_range === "Master+"
                          ? "bg-[var(--color-tier-a-bg)] text-[var(--color-tier-a)]"
                          : listing.rank_range === "Emerald" || listing.rank_range === "Platinum"
                            ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                            : "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                      )}>{listing.rank_range}</span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">{listing.contact_riot_id}</p>
                </div>
                <span className="font-mono text-[9px] text-[var(--color-text-muted)] shrink-0">{timeAgo(listing.updated_at)}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {listing.formats.map((f) => (
                  <span key={f} className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">{f}</span>
                ))}
                {listing.availability.map((a) => (
                  <span key={a} className="rounded bg-[var(--color-accent)]/5 px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-accent-text)]/60">{a}</span>
                ))}
              </div>

              {listing.notes && <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{listing.notes}</p>}
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
