"use client";

import { cn } from "@/lib/utils";
import type { PerformanceStats, ChampionPoolResponse } from "@/types";

// Champions by role with approachability rating (how quickly they can be learned)
const ROLE_CHAMPIONS: Record<string, { name: string; learnCurve: "Easy" | "Med" | "Hard"; why: string }[]> = {
  TOP: [
    { name: "Garen", learnCurve: "Easy", why: "Simple kit, tanky, forgiving — solid flex pick" },
    { name: "Malphite", learnCurve: "Easy", why: "One-button teamfight ult, tanky, great in Clash" },
    { name: "Darius", learnCurve: "Easy", why: "Strong lane bully, straightforward win conditions" },
    { name: "Shen", learnCurve: "Med", why: "Global presence, great for coordinated Clash play" },
    { name: "Camille", learnCurve: "Hard", why: "High reward but mechanical — invest 2+ weeks" },
  ],
  JUNGLE: [
    { name: "Amumu", learnCurve: "Easy", why: "Strong engage, forgiving mechanics, S-tier in Clash" },
    { name: "Warwick", learnCurve: "Easy", why: "Self-healing, straightforward pathing for beginners" },
    { name: "Vi", learnCurve: "Med", why: "Point-and-click ult for picks, good Clash coordination" },
    { name: "Zac", learnCurve: "Med", why: "Huge engage range, bloblet sustain, Clash staple" },
    { name: "Nidalee", learnCurve: "Hard", why: "Mechanically demanding — only if you commit fully" },
  ],
  MID: [
    { name: "Annie", learnCurve: "Easy", why: "Stun setup is straightforward, strong burst in teamfights" },
    { name: "Lux", learnCurve: "Easy", why: "Long-range poke + ult, low floor, decent Clash pick" },
    { name: "Orianna", learnCurve: "Med", why: "Shockwave is devastating with coordination, top Clash pick" },
    { name: "Galio", learnCurve: "Med", why: "Global ult, great with comms, anti-AP flex" },
    { name: "Azir", learnCurve: "Hard", why: "Extremely high ceiling — months to master properly" },
  ],
  BOT: [
    { name: "Ashe", learnCurve: "Easy", why: "Global CC ult, utility-focused, great for team coordination" },
    { name: "Miss Fortune", learnCurve: "Easy", why: "Bullet Time combos with AoE CC, low mechanical floor" },
    { name: "Jinx", learnCurve: "Med", why: "Snowball potential, Get Excited resets — S-tier Clash ADC" },
    { name: "Jhin", learnCurve: "Med", why: "Curtain Call coordination with team is devastating" },
    { name: "Caitlyn", learnCurve: "Easy", why: "Safe, reliable, strong objective control in premade" },
  ],
  SUPPORT: [
    { name: "Lux", learnCurve: "Easy", why: "Poke + shield, forgiving landing, good utility" },
    { name: "Soraka", learnCurve: "Easy", why: "Global heal, keep your carry alive, low skill floor" },
    { name: "Leona", learnCurve: "Med", why: "Hard engage, CC chain dependent — great with comms" },
    { name: "Thresh", learnCurve: "Med", why: "Lantern + hooks reward coordination perfectly" },
    { name: "Lulu", learnCurve: "Med", why: "Hyper carry enabler — top Clash support with voice" },
  ],
};

interface PocketPickSuggesterProps {
  performance: PerformanceStats;
  championPool: ChampionPoolResponse;
}

const ROLE_DISPLAY: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MID: "Mid",
  BOT: "Bot",
  SUPPORT: "Support",
};

export function PocketPickSuggester({ performance, championPool }: PocketPickSuggesterProps) {
  const poolNames = new Set(championPool.champions.map((c) => c.champion_name.toLowerCase()));

  // Find roles with thin coverage (played but low champion diversity)
  const roleDistribution = performance.role_distribution ?? [];
  const primaryRoles = roleDistribution
    .sort((a, b) => b.games - a.games)
    .slice(0, 2)
    .map((r) => r.role.toUpperCase());

  // For each primary role, find champions not in pool
  const suggestions = primaryRoles.flatMap((role) => {
    const roleCandidates = ROLE_CHAMPIONS[role] ?? [];
    const notInPool = roleCandidates.filter(
      (c) => !poolNames.has(c.name.toLowerCase())
    );
    return notInPool.slice(0, 2).map((c) => ({ ...c, role }));
  });

  // Also suggest for gap roles (roles they barely play)
  const allRoles = Object.keys(ROLE_CHAMPIONS);
  const weakRoles = allRoles.filter(
    (r) => !roleDistribution.find((rd) => rd.role.toUpperCase() === r && rd.percentage > 10)
  );
  const gapSuggestions = weakRoles.flatMap((role) => {
    const easyCandidates = (ROLE_CHAMPIONS[role] ?? []).filter(
      (c) => c.learnCurve === "Easy" && !poolNames.has(c.name.toLowerCase())
    );
    return easyCandidates.slice(0, 1).map((c) => ({ ...c, role, isGapFill: true }));
  });

  if (suggestions.length === 0 && gapSuggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">Pocket Pick Suggestions</h2>
        <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
          Champions worth adding to your pool based on your playstyle
        </p>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
            Expand Your Main Roles
          </p>
          <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
            {suggestions.map((s, i) => (
              <div key={i}
                className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--background)] px-4 py-3 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</span>
                    <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                      {ROLE_DISPLAY[s.role] ?? s.role}
                    </span>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[9px]",
                      s.learnCurve === "Easy" ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" :
                      s.learnCurve === "Med" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" :
                      "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                    )}>
                      {s.learnCurve}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{s.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {gapSuggestions.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[9px] tracking-widest uppercase text-[var(--color-text-muted)]">
            Fill Role Gaps (Easy Picks)
          </p>
          <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
            {gapSuggestions.map((s, i) => (
              <div key={i}
                className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--background)] px-4 py-3 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</span>
                    <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
                      {ROLE_DISPLAY[s.role] ?? s.role}
                    </span>
                    <span className="rounded bg-[var(--color-tier-a-bg)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-tier-a)]">
                      Flex Option
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{s.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
