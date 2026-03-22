import { create } from "zustand";
import type {
  ChampionSuggestion,
  DraftBan,
  DraftPhase,
  DraftPick,
  DraftScores,
} from "@/types";

interface DraftState {
  sessionId: string | null;
  mode: "clash" | "custom" | "scrim";
  status: "idle" | "in_progress" | "completed";
  bluePicks: DraftPick[];
  redPicks: DraftPick[];
  blueBans: DraftBan[];
  redBans: DraftBan[];
  currentPhase: DraftPhase;
  scores: DraftScores | null;
  suggestions: ChampionSuggestion[];
  activeSide: "blue" | "red";

  setSession: (sessionId: string, mode: "clash" | "custom" | "scrim") => void;
  addBluePick: (pick: DraftPick) => void;
  addRedPick: (pick: DraftPick) => void;
  addBlueBan: (ban: DraftBan) => void;
  addRedBan: (ban: DraftBan) => void;
  setPhase: (phase: DraftPhase) => void;
  setScores: (scores: DraftScores) => void;
  setSuggestions: (suggestions: ChampionSuggestion[]) => void;
  setActiveSide: (side: "blue" | "red") => void;
  updateFromSession: (session: {
    blue_picks: DraftPick[];
    red_picks: DraftPick[];
    blue_bans: DraftBan[];
    red_bans: DraftBan[];
    current_phase: DraftPhase;
    status: "in_progress" | "completed" | "abandoned";
  }) => void;
  reset: () => void;
}

export const useDraftStore = create<DraftState>()((set) => ({
  sessionId: null,
  mode: "clash",
  status: "idle",
  bluePicks: [],
  redPicks: [],
  blueBans: [],
  redBans: [],
  currentPhase: "ban_phase_1",
  scores: null,
  suggestions: [],
  activeSide: "blue",

  setSession: (sessionId, mode) =>
    set({ sessionId, mode, status: "in_progress" }),

  addBluePick: (pick) =>
    set((state) => ({ bluePicks: [...state.bluePicks, pick] })),

  addRedPick: (pick) =>
    set((state) => ({ redPicks: [...state.redPicks, pick] })),

  addBlueBan: (ban) =>
    set((state) => ({ blueBans: [...state.blueBans, ban] })),

  addRedBan: (ban) =>
    set((state) => ({ redBans: [...state.redBans, ban] })),

  setPhase: (phase) => set({ currentPhase: phase }),

  setScores: (scores) => set({ scores }),

  setSuggestions: (suggestions) => set({ suggestions }),

  setActiveSide: (side) => set({ activeSide: side }),

  updateFromSession: (session) =>
    set({
      bluePicks: session.blue_picks,
      redPicks: session.red_picks,
      blueBans: session.blue_bans,
      redBans: session.red_bans,
      currentPhase: session.current_phase,
      status:
        session.status === "in_progress" ? "in_progress" : "completed",
    }),

  reset: () =>
    set({
      sessionId: null,
      mode: "clash",
      status: "idle",
      bluePicks: [],
      redPicks: [],
      blueBans: [],
      redBans: [],
      currentPhase: "ban_phase_1",
      scores: null,
      suggestions: [],
      activeSide: "blue",
    }),
}));
