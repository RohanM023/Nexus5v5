"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ROLES = ["Top", "Jungle", "Mid", "Bot", "Support"] as const;
type Role = (typeof ROLES)[number];

const RANKS = [
  "Iron", "Bronze", "Silver", "Gold", "Platinum",
  "Emerald", "Diamond", "Master", "Grandmaster", "Challenger",
] as const;

interface Listing {
  id: string;
  riotId: string;
  roles: Role[];
  rank: string;
  champions: string;
  discord: string;
  notes: string;
  postedAt: string;
}

const MOCK_LISTINGS: Listing[] = [
  {
    id: "mock-1",
    riotId: "Faker#KR1",
    roles: ["Mid"],
    rank: "Challenger",
    champions: "Azir, Orianna, LeBlanc",
    discord: "faker#0001",
    notes: "LF Clash team, available weekends. Shotcaller preferred.",
    postedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "mock-2",
    riotId: "Doublelift#NA1",
    roles: ["Bot"],
    rank: "Diamond",
    champions: "Jinx, Caitlyn, Jhin",
    discord: "",
    notes: "Need a support main. Plat+ only please.",
    postedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "mock-3",
    riotId: "Thresh#EUW",
    roles: ["Support", "Top"],
    rank: "Platinum",
    champions: "Thresh, Nautilus, Malphite",
    discord: "thresh#9999",
    notes: "Flex between sup/top. Chill vibes, just want to win Clash.",
    postedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "mock-4",
    riotId: "Canyon#KR2",
    roles: ["Jungle"],
    rank: "Master",
    champions: "Nidalee, Graves, Vi",
    discord: "canyon#1234",
    notes: "Looking for a coordinated team. Must have comms.",
    postedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

const STORAGE_KEY = "lynkr-find-listings";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RoleBadge({ role, small }: { role: Role; small?: boolean }) {
  const colors: Record<Role, string> = {
    Top: "text-[var(--color-tier-a)] bg-[var(--color-tier-a-bg)]",
    Jungle: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
    Mid: "text-[var(--color-tier-s)] bg-[var(--color-tier-s-bg)]",
    Bot: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]/20",
    Support: "text-[var(--color-tier-b)] bg-[var(--color-tier-b-bg)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-mono font-medium uppercase tracking-wider",
        colors[role],
        small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      )}
    >
      {role}
    </span>
  );
}

function RankBadge({ rank }: { rank: string }) {
  const color =
    rank === "Challenger" || rank === "Grandmaster" || rank === "Master"
      ? "text-[var(--color-tier-s)]"
      : rank === "Diamond" || rank === "Emerald"
        ? "text-[var(--color-tier-a)]"
        : rank === "Platinum" || rank === "Gold"
          ? "text-[var(--color-success)]"
          : "text-[var(--color-text-muted)]";
  return (
    <span className={cn("font-mono text-[10px] font-medium tracking-wider", color)}>
      {rank}
    </span>
  );
}

export default function FindPage() {
  const { user, isAuthenticated } = useAuth();
  const { profile, championPool } = useProfile(user?.id);

  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState<Role | "All">("All");

  // Form state
  const [riotId, setRiotId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [rank, setRank] = useState("");
  const [champions, setChampions] = useState("");
  const [discord, setDiscord] = useState("");
  const [notes, setNotes] = useState("");
  const [myListingId, setMyListingId] = useState<string | null>(null);

  // Load persisted listings
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Listing[];
        setUserListings(parsed);
      }
    } catch {}
  }, []);

  // Autofill from profile
  useEffect(() => {
    if (!isAuthenticated) return;
    const primary = profile?.accounts?.find((a) => a.is_primary) ?? profile?.accounts?.[0];
    if (primary) setRiotId(`${primary.game_name}#${primary.tag_line}`);

    if (championPool?.champions?.length) {
      const top = championPool.champions
        .slice(0, 3)
        .map((c) => c.champion_name)
        .join(", ");
      setChampions(top);
    }
  }, [isAuthenticated, profile, championPool]);

  const toggleRole = (r: Role) => {
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const handlePost = () => {
    if (!riotId.trim() || roles.length === 0 || !rank) return;
    const listing: Listing = {
      id: crypto.randomUUID(),
      riotId: riotId.trim(),
      roles,
      rank,
      champions: champions.trim(),
      discord: discord.trim(),
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

  const allListings = [...userListings, ...MOCK_LISTINGS];
  const filtered =
    filterRole === "All"
      ? allListings
      : allListings.filter((l) => l.roles.includes(filterRole));

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none transition-colors";

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            Find Teammates
          </h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            LFG for Clash — post your listing or browse players
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              if (!isAuthenticated) return;
              setShowForm(true);
            }}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? "Sign in to post a listing" : undefined}
            className={cn(
              "rounded-md px-4 py-2 text-[10px] font-medium tracking-widest uppercase transition-colors",
              isAuthenticated
                ? "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
                : "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            )}
          >
            {myListingId ? "Update Listing" : "+ Post Listing"}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="border-l-2 border-amber-600/50 bg-amber-600/5 px-4 py-2 text-xs text-amber-400">
          <Link href="/login" className="underline hover:text-amber-300">
            Sign in
          </Link>{" "}
          to post a listing. Your profile will autofill your Riot ID and champion pool.
        </div>
      )}

      {/* Post Form */}
      {showForm && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[10px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">
              Your Listing
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
                Riot ID
              </label>
              <input
                className={inputClass}
                placeholder="GameName#TAG"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
                Rank
              </label>
              <select
                className={inputClass}
                value={rank}
                onChange={(e) => setRank(e.target.value)}
              >
                <option value="">Select rank...</option>
                {RANKS.map((r) => (
                  <option key={r} value={r} className="bg-[var(--color-surface)]">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
              Roles <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={cn(
                    "rounded border px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors",
                    roles.includes(r)
                      ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
              Main Champions
            </label>
            <input
              className={inputClass}
              placeholder="Jinx, Caitlyn, Jhin"
              value={champions}
              onChange={(e) => setChampions(e.target.value)}
            />
            {championPool?.champions?.length && champions && (
              <p className="mt-1 font-mono text-[9px] text-[var(--color-text-muted)]">
                Autofilled from your champion pool — edit freely
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
              Discord <span className="text-[var(--color-text-muted)]">(optional)</span>
            </label>
            <input
              className={inputClass}
              placeholder="username#0000"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
              Notes <span className="text-[var(--color-text-muted)]">(optional)</span>
            </label>
            <textarea
              className={cn(inputClass, "resize-none")}
              rows={3}
              placeholder="Availability, what you're looking for, comms preference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={280}
            />
            <p className="mt-1 text-right font-mono text-[9px] text-[var(--color-text-muted)]">
              {notes.length}/280
            </p>
          </div>

          <button
            onClick={handlePost}
            disabled={!riotId.trim() || roles.length === 0 || !rank}
            className={cn(
              "w-full rounded-md py-2.5 text-[10px] font-medium tracking-widest uppercase transition-colors",
              !riotId.trim() || roles.length === 0 || !rank
                ? "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                : "bg-[var(--color-accent-bg)] text-black hover:bg-[var(--color-accent-bg-hover)]"
            )}
          >
            Post Listing
          </button>
        </div>
      )}

      {/* My active listing banner */}
      {myListingId && !showForm && (
        <div className="flex items-center justify-between rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] px-4 py-2.5">
          <p className="text-[10px] text-[var(--color-success)]">
            Your listing is live — players can see you below.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleRemove}
              className="text-[10px] text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Browse */}
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
            Filter
          </span>
          {(["All", ...ROLES] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors",
                filterRole === r
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {r}
            </button>
          ))}
          <span className="ml-auto font-mono text-[9px] text-[var(--color-text-muted)]">
            {filtered.length} player{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
              No listings for this role yet.
            </div>
          )}
          {filtered.map((listing) => (
            <div
              key={listing.id}
              className={cn(
                "border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)]",
                listing.id === myListingId && "border-l-2 border-l-[var(--color-accent)]/50"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                    {listing.riotId}
                  </span>
                  {listing.id === myListingId && (
                    <span className="font-mono text-[9px] tracking-wider uppercase text-[var(--color-accent-text)]">
                      You
                    </span>
                  )}
                  <RankBadge rank={listing.rank} />
                  {listing.roles.map((r) => (
                    <RoleBadge key={r} role={r} small />
                  ))}
                </div>
                <span className="font-mono text-[9px] text-[var(--color-text-muted)]">
                  {timeAgo(listing.postedAt)}
                </span>
              </div>

              {listing.champions && (
                <p className="mt-1.5 text-[10px] text-[var(--color-text-secondary)]">
                  <span className="text-[var(--color-text-muted)]">Champs: </span>
                  {listing.champions}
                </p>
              )}

              {listing.notes && (
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                  {listing.notes}
                </p>
              )}

              {listing.discord && (
                <p className="mt-1.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                  Discord:{" "}
                  <span className="text-[var(--color-text-secondary)]">{listing.discord}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
