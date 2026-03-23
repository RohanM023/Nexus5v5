import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SeriesFormat = "bo3" | "bo5";

interface FearlessSeriesState {
  active: boolean;
  format: SeriesFormat;
  currentGame: number;
  teamAPickHistory: number[][];
  teamBPickHistory: number[][];
  gameCompleted: boolean[];

  getTeamALockedIds: () => number[];
  getTeamBLockedIds: () => number[];
  getAllLockedIds: () => number[];
  getMaxGames: () => number;
  isSeriesOver: () => boolean;

  startSeries: (format: SeriesFormat) => void;
  completeGame: (teamAPicks: number[], teamBPicks: number[]) => void;
  resetSeries: () => void;
}

export const useFearlessStore = create<FearlessSeriesState>()(
  persist(
    (set, get) => ({
      active: false,
      format: "bo3",
      currentGame: 1,
      teamAPickHistory: [],
      teamBPickHistory: [],
      gameCompleted: [],

      getTeamALockedIds: () => {
        const { teamAPickHistory, currentGame } = get();
        return teamAPickHistory.slice(0, currentGame - 1).flat();
      },

      getTeamBLockedIds: () => {
        const { teamBPickHistory, currentGame } = get();
        return teamBPickHistory.slice(0, currentGame - 1).flat();
      },

      getAllLockedIds: () => {
        const { teamAPickHistory, teamBPickHistory, currentGame } = get();
        const aLocked = teamAPickHistory.slice(0, currentGame - 1).flat();
        const bLocked = teamBPickHistory.slice(0, currentGame - 1).flat();
        return [...new Set([...aLocked, ...bLocked])];
      },

      getMaxGames: () => {
        return get().format === "bo3" ? 3 : 5;
      },

      isSeriesOver: () => {
        const { currentGame, format } = get();
        const max = format === "bo3" ? 3 : 5;
        return currentGame > max;
      },

      startSeries: (format) =>
        set({
          active: true,
          format,
          currentGame: 1,
          teamAPickHistory: [],
          teamBPickHistory: [],
          gameCompleted: [],
        }),

      completeGame: (teamAPicks, teamBPicks) => {
        const { teamAPickHistory, teamBPickHistory, gameCompleted, currentGame } = get();
        set({
          teamAPickHistory: [...teamAPickHistory, teamAPicks],
          teamBPickHistory: [...teamBPickHistory, teamBPicks],
          gameCompleted: [...gameCompleted, true],
          currentGame: currentGame + 1,
        });
      },

      resetSeries: () =>
        set({
          active: false,
          format: "bo3",
          currentGame: 1,
          teamAPickHistory: [],
          teamBPickHistory: [],
          gameCompleted: [],
        }),
    }),
    { name: "nexus-fearless-series" },
  ),
);
