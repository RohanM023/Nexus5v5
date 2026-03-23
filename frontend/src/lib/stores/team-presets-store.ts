import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TeamPreset {
  name: string;
  players: (TeamPresetPlayer | null)[];
  createdAt: string;
}

export interface TeamPresetPlayer {
  puuid: string;
  game_name: string;
  tag_line: string;
  role: string;
}

const MAX_PRESETS = 20;

interface TeamPresetsState {
  presets: TeamPreset[];
  savePreset: (name: string, players: (TeamPresetPlayer | null)[]) => void;
  loadPreset: (name: string) => TeamPreset | undefined;
  deletePreset: (name: string) => void;
}

export const useTeamPresetsStore = create<TeamPresetsState>()(
  persist(
    (set, get) => ({
      presets: [],

      savePreset: (name, players) =>
        set((state) => {
          const filtered = state.presets.filter((p) => p.name !== name);
          const newPreset: TeamPreset = {
            name,
            players: [...players],
            createdAt: new Date().toISOString(),
          };
          return { presets: [newPreset, ...filtered].slice(0, MAX_PRESETS) };
        }),

      loadPreset: (name) => {
        return get().presets.find((p) => p.name === name);
      },

      deletePreset: (name) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.name !== name),
        })),
    }),
    { name: "nexus-team-presets" },
  ),
);
