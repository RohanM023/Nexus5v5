"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getChampionIconUrl } from "@/lib/utils";

type Tier = "S" | "A" | "B" | "C" | "D";
type Role = "All" | "Top" | "Jungle" | "Mid" | "Bot" | "Support";

interface TierEntry {
  name: string;
  roles: Exclude<Role, "All">[];
  tier: Tier;
  why: string;
  pickRate: "High" | "Med" | "Low";
}

// Clash-specific tier list — 5v5 premade coordinated play, not solo queue
const TIER_LIST: TierEntry[] = [
  // S Tier — dominant in coordinated play
  { name: "Orianna", roles: ["Mid"], tier: "S", why: "Shockwave enables team engage; command synergies scale with coordination", pickRate: "High" },
  { name: "Malphite", roles: ["Top", "Support"], tier: "S", why: "Unstoppable Impulse is a free teamfight; 100% reliable in premades", pickRate: "High" },
  { name: "Amumu", roles: ["Jungle", "Support"], tier: "S", why: "Bandage Toss + Curse of the Sad Mummy = instant teamfight win with follow-up", pickRate: "Med" },
  { name: "Shen", roles: ["Top"], tier: "S", why: "Global presence; Stand United coordination is near-impossible in solo but free in Clash", pickRate: "Med" },
  { name: "Jarvan IV", roles: ["Jungle"], tier: "S", why: "Cataclysm + coordinated follow-up catches enemies perfectly; strong objective control", pickRate: "High" },
  { name: "Lulu", roles: ["Support"], tier: "S", why: "Hyper carries scale massively with Lulu; Wild Growth synergy is voice-comms dependent", pickRate: "High" },
  { name: "Jinx", roles: ["Bot"], tier: "S", why: "Snowball potential; Get Excited resets turn solo kills into multi-kills with coordination", pickRate: "High" },

  // A Tier — strong with communication
  { name: "Zac", roles: ["Jungle"], tier: "A", why: "Long-range engage; Let's Bounce is devastating with follow-up from comms", pickRate: "Med" },
  { name: "Thresh", roles: ["Support"], tier: "A", why: "Flay + Death Sentence creates picks; lantern is wasted in solo but free in Clash", pickRate: "High" },
  { name: "Azir", roles: ["Mid"], tier: "A", why: "Emperor's Divide peels perfectly for your carry; hard to execute alone", pickRate: "Low" },
  { name: "Braum", roles: ["Support"], tier: "A", why: "Passive setup requires coordination; Glacial Fissure with CC chain = gg", pickRate: "Med" },
  { name: "Jhin", roles: ["Bot"], tier: "A", why: "Curtain Call + engage partner is deadly; roots chain with comms", pickRate: "High" },
  { name: "Rumble", roles: ["Top", "Mid"], tier: "A", why: "Equalizer mid-teamfight with voice = free kills; peel or initiate flex", pickRate: "Low" },
  { name: "Sejuani", roles: ["Jungle"], tier: "A", why: "Glacial Prison from off-screen; Permafrost with ADC = braindead CC chain", pickRate: "Med" },
  { name: "Galio", roles: ["Mid", "Support"], tier: "A", why: "Hero's Entrance = global follow-up; completely changes teamfight geometry", pickRate: "Med" },
  { name: "Leona", roles: ["Support"], tier: "A", why: "Lock-down chains are telegraphed in solo; lethal with coordinated follow-up", pickRate: "High" },
  { name: "Sivir", roles: ["Bot"], tier: "A", why: "On The Hunt gives entire team move speed for coordinated engage or disengage", pickRate: "Med" },
  { name: "Kassadin", roles: ["Mid"], tier: "A", why: "Late-game hypercarry that teams can protect to 16; doable in premade", pickRate: "Med" },

  // B Tier — situationally strong
  { name: "Caitlyn", roles: ["Bot"], tier: "B", why: "Safe laning + Ace in the Hole coordination; objective focus is premade-friendly", pickRate: "High" },
  { name: "Nautilus", roles: ["Support"], tier: "B", why: "Reliable engage but telegraphed; best with dive comps", pickRate: "High" },
  { name: "Vi", roles: ["Jungle"], tier: "B", why: "Cease and Desist targets high-priority; teamfight pathing benefits from comms", pickRate: "Med" },
  { name: "Camille", roles: ["Top"], tier: "B", why: "Hextech Ultimatum isolates carries; less powerful if enemy has disengage", pickRate: "Med" },
  { name: "Lucian", roles: ["Bot", "Mid"], tier: "B", why: "Lightslinger combos with support; needs specific synergies to pop off", pickRate: "High" },
  { name: "Gnar", roles: ["Top"], tier: "B", why: "Mega Gnar timing with team is clutch; communication required for max value", pickRate: "Low" },
  { name: "Taliyah", roles: ["Jungle", "Mid"], tier: "B", why: "Weaver's Wall cuts off escapes with comms; roam timing benefits from voice", pickRate: "Low" },
  { name: "Ashe", roles: ["Bot"], tier: "B", why: "Hawkshot + Enchanted Crystal Arrow coordination across map; utility carry", pickRate: "High" },
  { name: "Rell", roles: ["Support"], tier: "B", why: "Magnet Storm in dive comp is huge; clunky solo but coordinated pairs well", pickRate: "Low" },

  // C Tier — solo queue picks, not as strong premade
  { name: "Yasuo", roles: ["Mid", "Top"], tier: "C", why: "Needs knock-up partner; high mechanical floor means high-risk in Clash", pickRate: "High" },
  { name: "Tryndamere", roles: ["Top"], tier: "C", why: "Split-push menace but teams often don't follow-up properly on pressure", pickRate: "Med" },
  { name: "Zed", roles: ["Mid"], tier: "C", why: "Strong in solo but assassin identity undercuts teamfight compositions", pickRate: "High" },
  { name: "Vayne", roles: ["Bot", "Top"], tier: "C", why: "Mechanically demanding; outscaled in teamfights by coordinated engage", pickRate: "High" },
  { name: "Katarina", roles: ["Mid"], tier: "C", why: "CC-heavy compositions shut her down; enemies respect resets in premade", pickRate: "Med" },

  // D Tier — avoid in Clash
  { name: "Nunu", roles: ["Jungle"], tier: "D", why: "Absolute Zero needs enemies to stand still; premades always disengage", pickRate: "Low" },
  { name: "Yuumi", roles: ["Support"], tier: "D", why: "Attach mechanic is abusable by enemies who collapse your carry; unreliable", pickRate: "Med" },
];

const TIER_CONFIG: Record<Tier, { label: string; bg: string; text: string; border: string }> = {
  S: { label: "S", bg: "bg-[var(--color-tier-s-bg)]", text: "text-[var(--color-tier-s)]", border: "border-[var(--color-tier-s)]/30" },
  A: { label: "A", bg: "bg-[var(--color-tier-a-bg)]", text: "text-[var(--color-tier-a)]", border: "border-[var(--color-tier-a)]/30" },
  B: { label: "B", bg: "bg-[var(--color-tier-b-bg)]", text: "text-[var(--color-tier-b)]", border: "border-[var(--color-tier-b)]/30" },
  C: { label: "C", bg: "bg-[var(--color-tier-c-bg)]", text: "text-[var(--color-tier-c)]", border: "border-[var(--color-tier-c)]/30" },
  D: { label: "D", bg: "bg-[var(--color-danger)]/10", text: "text-[var(--color-danger)]", border: "border-[var(--color-danger)]/20" },
};

const ROLES: Role[] = ["All", "Top", "Jungle", "Mid", "Bot", "Support"];
const TIERS: Tier[] = ["S", "A", "B", "C", "D"];

export default function TierListPage() {
  const [filterRole, setFilterRole] = useState<Role>("All");
  const [expandedTiers, setExpandedTiers] = useState<Set<Tier>>(new Set(["S", "A", "B"]));

  const toggleTier = (tier: Tier) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  const filtered = TIER_LIST.filter(
    (e) => filterRole === "All" || e.roles.includes(filterRole as Exclude<Role, "All">)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
          Clash Tier List
        </h1>
        <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
          5v5 premade coordinated play — not solo queue
        </p>
      </div>

      <div className="rounded-md border border-amber-600/20 bg-amber-600/5 px-4 py-2 text-[10px] text-amber-400/80">
        Ratings assume voice comms and coordinated play. Solo queue tier lists will differ significantly.
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={cn(
              "rounded px-3 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors",
              filterRole === r
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Tier rows */}
      <div className="space-y-2">
        {TIERS.map((tier) => {
          const entries = filtered.filter((e) => e.tier === tier);
          if (entries.length === 0) return null;
          const cfg = TIER_CONFIG[tier];
          const expanded = expandedTiers.has(tier);

          return (
            <div key={tier} className={cn("overflow-hidden rounded-lg border", cfg.border)}>
              <button
                onClick={() => toggleTier(tier)}
                className={cn(
                  "flex w-full items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]",
                  cfg.bg
                )}
              >
                <span className={cn("w-6 text-left font-mono text-lg font-bold", cfg.text)}>
                  {tier}
                </span>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {entries.slice(0, expanded ? undefined : 6).map((e) => (
                    <div
                      key={e.name}
                      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded"
                      title={e.name}
                    >
                      <Image
                        src={getChampionIconUrl(e.name)}
                        alt={e.name}
                        width={28}
                        height={28}
                        className="rounded"
                        unoptimized
                      />
                    </div>
                  ))}
                  {!expanded && entries.length > 6 && (
                    <span className="flex h-7 items-center font-mono text-[9px] text-[var(--color-text-muted)]">
                      +{entries.length - 6} more
                    </span>
                  )}
                </div>
                <svg
                  className={cn("h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform", expanded && "rotate-180")}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded && (
                <div className="divide-y divide-[var(--color-border)]">
                  {entries.map((e) => (
                    <div key={e.name} className="flex items-center gap-3 bg-[var(--color-surface)] px-4 py-2.5">
                      <Image
                        src={getChampionIconUrl(e.name)}
                        alt={e.name}
                        width={32}
                        height={32}
                        className="rounded shrink-0"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[var(--color-text-primary)]">{e.name}</span>
                          <div className="flex gap-1">
                            {e.roles.map((r) => (
                              <span key={r} className="font-mono text-[9px] text-[var(--color-text-muted)]">{r}</span>
                            ))}
                          </div>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{e.why}</p>
                      </div>
                      <span className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wider",
                        e.pickRate === "High" ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" :
                        e.pickRate === "Med" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" :
                        "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                      )}>
                        {e.pickRate}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
