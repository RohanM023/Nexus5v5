"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { FindListing } from "@/types";

const ROLES = ["Top", "Jungle", "Mid", "Bot", "Support"] as const;
type Role = (typeof ROLES)[number];

const RANKS = [
  "Iron", "Bronze", "Silver", "Gold", "Platinum",
  "Emerald", "Diamond", "Master", "Grandmaster", "Challenger",
] as const;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RoleBadge({ role, small }: { role: string; small?: boolean }) {
  const colors: Record<string, string> = {
    Top: "text-[var(--color-tier-a)] bg-[var(--color-tier-a-bg)]",
    Jungle: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
    Mid: "text-[var(--color-tier-s)] bg-[var(--color-tier-s-bg)]",
    Bot: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]/20",
    Support: "text-[var(--color-tier-b)] bg-[var(--color-tier-b-bg)]",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded font-mono font-medium uppercase tracking-wider",
      colors[role] ?? "text-[var(--color-text-muted)] bg-[var(--color-surface)]",
      small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
    )}>
      {role}
    </span>
  );
}

export default function FindPage() {
  const { user, isAuthenticated } = useAuth();
  const { profile, championPool } = useProfile(user?.id);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState<Role | "All">("All");

  const [riotId, setRiotId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [rank, setRank] = useState("");
  const [champions, setChampions] = useState("");
  const [discord, setDiscord] = useState("");
  const [notes, setNotes] = useState("");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["find-listings"],
    queryFn: () => api.getFindListings(),
    refetchInterval: 30_000,
  });

  const upsertMutation = useMutation({
    mutationFn: api.upsertFindListing.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["find-listings"] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteFindListing.bind(api),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["find-listings"] }),
  });

  const myListing = listings.find((l) => l.user_id === user?.id);

  // Autofill from profile
  useEffect(() => {
    if (!isAuthenticated) return;
    const primary = profile?.accounts?.find((a) => a.is_primary) ?? profile?.accounts?.[0];
    if (primary && !riotId) setRiotId(`${primary.game_name}#${primary.tag_line}`);
    if (championPool?.champions?.length && !champions) {
      setChampions(championPool.champions.slice(0, 3).map((c) => c.champion_name).join(", "));
    }
  }, [isAuthenticated, profile, championPool]);

  // Prefill form from existing listing when editing
  useEffect(() => {
    if (myListing && showForm) {
      setRiotId(myListing.riot_id);
      setRoles(myListing.roles as Role[]);
      setRank(myListing.rank ?? "");
      setChampions(myListing.champions ?? "");
      setDiscord(myListing.discord ?? "");
      setNotes(myListing.notes ?? "");
    }
  }, [myListing, showForm]);

  const toggleRole = (r: Role) =>
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  const handlePost = () => {
    if (!riotId.trim() || roles.length === 0 || !rank) return;
    upsertMutation.mutate({ riot_id: riotId.trim(), roles, rank, champions: champions.trim(), discord: discord.trim(), notes: notes.trim() });
  };

  const filtered = filterRole === "All"
    ? listings
    : listings.filter((l) => l.roles.includes(filterRole));

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none transition-colors";

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Find Teammates</h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            LFG for Clash — post your listing or browse players
          </p>
        </div>
        {!showForm && (
          <button onClick={() => isAuthenticated && setShowForm(true)} disabled={!isAuthenticated}
            title={!isAuthenticated ? "Sign in to post a listing" : undefined}
            className={cn(
              "rounded-md px-4 py-2 text-[10px] font-medium tracking-widest uppercase transition-colors",
              isAuthenticated
                ? "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
                : "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            )}>
            {myListing ? "Update Listing" : "+ Post Listing"}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="border-l-2 border-amber-600/50 bg-amber-600/5 px-4 py-2 text-xs text-amber-400">
          <Link href="/login" className="underline hover:text-amber-300">Sign in</Link>{" "}
          to post a listing. Your profile will autofill your Riot ID and champion pool.
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[10px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">Your Listing</h2>
            <button onClick={() => setShowForm(false)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Riot ID</label>
              <input className={inputClass} placeholder="GameName#TAG" value={riotId} onChange={(e) => setRiotId(e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Rank</label>
              <select className={inputClass} value={rank} onChange={(e) => setRank(e.target.value)}>
                <option value="">Select rank...</option>
                {RANKS.map((r) => <option key={r} value={r} className="bg-[var(--color-surface)]">{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Roles *</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)}
                  className={cn(
                    "rounded border px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors",
                    roles.includes(r)
                      ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                  )}>{r}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Main Champions</label>
            <input className={inputClass} placeholder="Jinx, Caitlyn, Jhin" value={champions} onChange={(e) => setChampions(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Discord (optional)</label>
            <input className={inputClass} placeholder="username#0000" value={discord} onChange={(e) => setDiscord(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Notes (optional)</label>
            <textarea className={cn(inputClass, "resize-none")} rows={3}
              placeholder="Availability, what you're looking for, comms preference..."
              value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={280} />
            <p className="mt-1 text-right font-mono text-[9px] text-[var(--color-text-muted)]">{notes.length}/280</p>
          </div>

          <button onClick={handlePost} disabled={!riotId.trim() || roles.length === 0 || !rank || upsertMutation.isPending}
            className={cn(
              "w-full rounded-md py-2.5 text-[10px] font-medium tracking-widest uppercase transition-colors",
              !riotId.trim() || roles.length === 0 || !rank
                ? "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                : "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
            )}>
            {upsertMutation.isPending ? "Posting..." : "Post Listing"}
          </button>
        </div>
      )}

      {myListing && !showForm && (
        <div className="flex items-center justify-between rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] px-4 py-2.5">
          <p className="text-[10px] text-[var(--color-success)]">Your listing is live — visible to all players.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(true)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Edit</button>
            <button onClick={() => deleteMutation.mutate()} className="text-[10px] text-[var(--color-danger)] hover:text-[var(--color-danger)]/80">Remove</button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">Filter</span>
          {(["All", ...ROLES] as const).map((r) => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors",
                filterRole === r ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}>{r}</button>
          ))}
          <span className="ml-auto font-mono text-[9px] text-[var(--color-text-muted)]">
            {filtered.length} player{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
          {isLoading && <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Loading...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">No listings yet. Be the first to post!</div>
          )}
          {filtered.map((listing: FindListing) => (
            <div key={listing.id}
              className={cn(
                "border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)]",
                listing.user_id === user?.id && "border-l-2 border-l-[var(--color-accent)]/50"
              )}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">{listing.riot_id}</span>
                  {listing.user_id === user?.id && (
                    <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-accent-text)]">You</span>
                  )}
                  {listing.rank && <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{listing.rank}</span>}
                  {listing.roles.map((r) => <RoleBadge key={r} role={r} small />)}
                </div>
                <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{timeAgo(listing.updated_at)}</span>
              </div>
              {listing.champions && (
                <p className="mt-1.5 text-[10px] text-[var(--color-text-secondary)]">
                  <span className="text-[var(--color-text-muted)]">Champs: </span>{listing.champions}
                </p>
              )}
              {listing.notes && <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{listing.notes}</p>}
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
