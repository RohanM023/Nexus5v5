import { create } from "zustand";
import type { DashboardMode, TeamPlayer, TeamRole } from "@/types";

interface BanEntry {
  id: number;
  name: string;
}

interface ClashState {
  mode: DashboardMode;
  yourTeam: (TeamPlayer | null)[];
  opponentTeam: (TeamPlayer | null)[];
  yourBans: (BanEntry | null)[];
  opponentBans: (BanEntry | null)[];
  activeSessionId: string | null;
  searchQuery: string;

  setMode: (mode: DashboardMode) => void;
  setSearchQuery: (query: string) => void;
  setActiveSession: (id: string | null) => void;
  addPlayer: (
    side: "your" | "opponent",
    role: TeamRole,
    player: TeamPlayer
  ) => void;
  removePlayer: (side: "your" | "opponent", role: TeamRole) => void;
  setSelectedChampion: (
    side: "your" | "opponent",
    role: TeamRole,
    champion: { id: number; name: string } | undefined
  ) => void;
  addBan: (side: "your" | "opponent", champion: BanEntry) => void;
  removeBan: (side: "your" | "opponent", championId: number) => void;
  resetTeams: () => void;
}

const ROLES: TeamRole[] = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];

function roleIndex(role: TeamRole): number {
  return ROLES.indexOf(role);
}

const emptyTeam = (): (TeamPlayer | null)[] => [
  null,
  null,
  null,
  null,
  null,
];

const emptyBans = (): (BanEntry | null)[] => [null, null, null, null, null];

export const useClashStore = create<ClashState>()((set) => ({
  mode: "clash",
  yourTeam: emptyTeam(),
  opponentTeam: emptyTeam(),
  yourBans: emptyBans(),
  opponentBans: emptyBans(),
  activeSessionId: null,
  searchQuery: "",

  setMode: (mode) => set({ mode }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  addPlayer: (side, role, player) =>
    set((state) => {
      const team =
        side === "your" ? [...state.yourTeam] : [...state.opponentTeam];
      team[roleIndex(role)] = { ...player, role };
      return side === "your"
        ? { yourTeam: team }
        : { opponentTeam: team };
    }),

  removePlayer: (side, role) =>
    set((state) => {
      const team =
        side === "your" ? [...state.yourTeam] : [...state.opponentTeam];
      team[roleIndex(role)] = null;
      return side === "your"
        ? { yourTeam: team }
        : { opponentTeam: team };
    }),

  setSelectedChampion: (side, role, champion) =>
    set((state) => {
      const team =
        side === "your" ? [...state.yourTeam] : [...state.opponentTeam];
      const idx = roleIndex(role);
      if (team[idx]) {
        team[idx] = { ...team[idx]!, selected_champion: champion };
      }
      return side === "your"
        ? { yourTeam: team }
        : { opponentTeam: team };
    }),

  addBan: (side, champion) =>
    set((state) => {
      const bans = side === "your" ? [...state.yourBans] : [...state.opponentBans];
      const emptyIdx = bans.findIndex((b) => b === null);
      if (emptyIdx === -1) return {};
      bans[emptyIdx] = champion;
      return side === "your" ? { yourBans: bans } : { opponentBans: bans };
    }),

  removeBan: (side, championId) =>
    set((state) => {
      const bans = side === "your" ? [...state.yourBans] : [...state.opponentBans];
      const idx = bans.findIndex((b) => b?.id === championId);
      if (idx === -1) return {};
      bans[idx] = null;
      return side === "your" ? { yourBans: bans } : { opponentBans: bans };
    }),

  resetTeams: () =>
    set({
      yourTeam: emptyTeam(),
      opponentTeam: emptyTeam(),
      yourBans: emptyBans(),
      opponentBans: emptyBans(),
      activeSessionId: null,
    }),
}));
