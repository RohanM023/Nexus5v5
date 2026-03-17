# Nexus-5v5 Dashboard UI Overhaul — Implementation Plan

> **Status: COMPLETE** — All 7 phases implemented and verified. Build passes. `use-clash-dashboard` hook added, `clash-view` refactored to use it.

## Goal
Redesign the main dashboard to match the mockup: a full Clash/5v5 draft dashboard with team composition, True Mastery per player, radar chart, win probability, draft recommendations, and ban priority — all in a single cohesive view.

## Architecture Decision

**Route: `/dashboard` becomes the unified hub** with mode tabs (Solo Queue / Multisearch / Clash/5v5). The Clash/5v5 tab shows the mockup view. The current `/draft/[id]` page stays for standalone draft sessions — the dashboard integrates draft features inline.

---

## Phase 1: Layout & Navigation Updates

### 1a. Update Navbar (`frontend/src/components/ui/navbar.tsx`)
- Add TEAMS and LEADERBOARDS nav links (placeholder pages for now)
- Keep Search, Dashboard, Settings, user avatar

### 1b. Restructure Dashboard Page (`frontend/src/app/(dashboard)/dashboard/page.tsx`)
- Add mode tabs at the top: **SOLO QUEUE** | **MULTISEARCH** | **CLASH/5V5**
- Add search bar below tabs: "Search Team, Player, or Clash ID"
- The active tab determines which view to render
- Default to CLASH/5V5 tab (the mockup view)
- Create new component: `frontend/src/components/dashboard/mode-tabs.tsx`

---

## Phase 2: Clash Dashboard — Team Panels

### 2a. Your Team Panel (`frontend/src/components/dashboard/team-panel.tsx`)
Props: `{ players: TeamPlayer[], side: "your" | "opponent" }`
- 5 role columns (TOP, JG, MID, BOT, SUPP)
- Each column shows:
  - Champion portrait (selected champ or empty circle)
  - Player name (game_name#tag_line)
  - "Alt Accounts Linked" — list of linked alt accounts (from Identity Aggregation)
  - "TRUE MASTERY" — top 3 champions with icons + scores

### 2b. New Types (`frontend/src/types/index.ts`)
```ts
interface TeamPlayer {
  puuid: string;
  game_name: string;
  tag_line: string;
  role: "TOP" | "JUNGLE" | "MID" | "BOT" | "SUPPORT";
  selected_champion?: { id: number; name: string };
  alt_accounts: { game_name: string; tag_line: string }[];
  top_champions: { champion_id: number; champion_name: string; true_mastery: number }[];
}
```

### 2c. Player Role Column (`frontend/src/components/dashboard/player-column.tsx`)
- Reusable column component for one player slot
- Shows champion icon, name, alts, mastery

---

## Phase 3: Center "Versus" Section

### 3a. Radar Chart (`frontend/src/components/charts/team-radar-chart.tsx`)
- Uses Recharts `RadarChart` with `PolarGrid`, `PolarAngleAxis`, `Radar`
- 6 axes: Early Aggression, Objective Priority, Combat Style, CC Intensity, Vision Control, Damage Balance
- Two overlapping filled areas: Your Team (teal/green) vs Opponent Team (blue/gray)
- Data source: Derive from team champion selections using static champion attribute data
  - For MVP: Use hardcoded champion archetype data (e.g., "early game champions" get high Early Aggression)
  - Future: Backend endpoint that computes team style from match data

### 3b. Win Probability Bar (`frontend/src/components/dashboard/win-probability.tsx`)
- "WIN PROBABILITY: 62% for YOUR TEAM"
- Horizontal progress bar, color-coded (green for >50%)
- Data: Compute from draft composite score (synergy + counter + comfort → scale to 40%-60% range for display)
- For MVP: Use the draft `total_score` mapped to a probability-like display

---

## Phase 4: Draft Assistant Engine Section

### 4a. Recommendation Row (`frontend/src/components/dashboard/recommendation-row.tsx`)
- Horizontal layout of 4 numbered champion cards
- Each card: rank number, champion portrait, "Team Synergy: +X.X%", "Opponent Counter: +X.X%"
- Data source: `/api/v1/draft/suggestions/{session_id}` — already implemented
- Reuses data from existing `ChampionSuggestion` type but with a more compact card layout

### 4b. Ban Priority Section (`frontend/src/components/dashboard/ban-priority.tsx`)
- "BAN PRIORITY BASED ON OPPONENT CHAMPION POOLS"
- Two rows of champion icons (6-8 per row)
- Data: For MVP, derive from opponent team's top comfort champions
  - Query opponent players' champion pools, rank by comfort score, show top picks as ban targets
- Future: Backend endpoint specifically for ban recommendations

---

## Phase 5: Clash Dashboard Composition

### 5a. Main Clash View (`frontend/src/components/dashboard/clash-view.tsx`)
Composes all Phase 2-4 components into the mockup layout:
```
┌──────────────────────────────────────────────────────┐
│  YOUR TEAM          VERSUS           OPPONENT TEAM   │
│  [TeamPanel]    [RadarChart]         [TeamPanel]     │
│                 [WinProbability]                      │
├──────────────────────────────────────────────────────┤
│  DRAFT ASSISTANT ENGINE   LIVE SYNERGY/COUNTER PICKS │
│  [RecommendationRow - 4 champion cards]              │
├──────────────────────────────────────────────────────┤
│  BAN PRIORITY                                        │
│  [BanPriority - 2 rows of champion icons]            │
└──────────────────────────────────────────────────────┘
```

### 5b. Clash Dashboard Hook (`frontend/src/lib/hooks/use-clash-dashboard.ts`)
- Manages team roster state (5 players per team)
- Fetches champion pool data for each player (via analytics API)
- Integrates with draft store for picks/bans/scores/suggestions
- Computes derived data (radar chart values, win probability, ban priority)

### 5c. Clash Dashboard Store (`frontend/src/lib/stores/clash-store.ts`)
Zustand store for Clash-specific state:
- `yourTeam: TeamPlayer[]` — 5 player slots
- `opponentTeam: TeamPlayer[]` — 5 player slots (may be empty)
- `activeSessionId: string | null` — linked draft session
- Actions: `addPlayer`, `removePlayer`, `setRole`, `setSelectedChampion`

---

## Phase 6: Solo Queue & Multisearch Tabs (Stubs)

### 6a. Solo Queue View (`frontend/src/components/dashboard/solo-queue-view.tsx`)
- Summoner search → shows profile stats, match history, champion pool
- Reuses existing profile/match components

### 6b. Multisearch View (`frontend/src/components/dashboard/multisearch-view.tsx`)
- Paste multiple summoner names → see all players' pools side by side
- Stub for now with "Coming Soon" placeholder

---

## Phase 7: Placeholder Pages

### 7a. Teams Page (`frontend/src/app/(dashboard)/teams/page.tsx`)
- List and manage Clash teams
- Stub with team creation UI

### 7b. Leaderboards Page (`frontend/src/app/(dashboard)/leaderboards/page.tsx`)
- Placeholder with "Coming Soon"

---

## New Files Summary

| File | Purpose |
|------|---------|
| `components/dashboard/mode-tabs.tsx` | Solo Queue / Multisearch / Clash tab switcher |
| `components/dashboard/clash-view.tsx` | Main Clash dashboard composition |
| `components/dashboard/team-panel.tsx` | 5-role team display (your team / opponent) |
| `components/dashboard/player-column.tsx` | Single player role column with alts + mastery |
| `components/dashboard/win-probability.tsx` | Win probability bar |
| `components/dashboard/recommendation-row.tsx` | Top 4 champion recommendations |
| `components/dashboard/ban-priority.tsx` | Ban priority champion icons |
| `components/dashboard/solo-queue-view.tsx` | Solo queue lookup view |
| `components/dashboard/multisearch-view.tsx` | Multi-search stub |
| `components/charts/team-radar-chart.tsx` | Recharts RadarChart for team comparison |
| `lib/hooks/use-clash-dashboard.ts` | Data fetching/state for clash view |
| `lib/stores/clash-store.ts` | Zustand store for team roster state |
| `app/(dashboard)/teams/page.tsx` | Teams page (stub) |
| `app/(dashboard)/leaderboards/page.tsx` | Leaderboards page (stub) |

## Modified Files

| File | Changes |
|------|---------|
| `components/ui/navbar.tsx` | Add Teams, Leaderboards nav links |
| `components/ui/sidebar.tsx` | Add Teams, Leaderboards sidebar links |
| `app/(dashboard)/dashboard/page.tsx` | Replace with mode-tabbed dashboard |
| `types/index.ts` | Add TeamPlayer, RadarDataPoint, ClashTeamState types |

## Execution Order
1. Types & store (foundation) → 2. Team panels & player columns → 3. Radar chart & win probability → 4. Draft recommendations & bans → 5. Compose clash-view → 6. Wire into dashboard page → 7. Nav updates & placeholder pages
