import { describe, it, expect, beforeEach } from "vitest";
import { useClashStore } from "@/lib/stores/clash-store";
import type { TeamPlayer } from "@/types";

const makePlayer = (role: TeamPlayer["role"], name: string): TeamPlayer => ({
  puuid: `puuid-${name}`,
  game_name: name,
  tag_line: "NA1",
  role,
  alt_accounts: [],
  top_champions: [
    { champion_id: 1, champion_name: "Annie", true_mastery: 85 },
  ],
});

describe("useClashStore", () => {
  beforeEach(() => {
    useClashStore.getState().resetTeams();
    useClashStore.setState({ mode: "clash", searchQuery: "" });
  });

  it("starts with empty teams", () => {
    const state = useClashStore.getState();
    expect(state.yourTeam.every((p) => p === null)).toBe(true);
    expect(state.opponentTeam.every((p) => p === null)).toBe(true);
    expect(state.activeSessionId).toBeNull();
  });

  it("defaults to clash mode", () => {
    expect(useClashStore.getState().mode).toBe("clash");
  });

  describe("setMode", () => {
    it("switches mode", () => {
      useClashStore.getState().setMode("solo-queue");
      expect(useClashStore.getState().mode).toBe("solo-queue");
    });
  });

  describe("setSearchQuery", () => {
    it("updates search query", () => {
      useClashStore.getState().setSearchQuery("test");
      expect(useClashStore.getState().searchQuery).toBe("test");
    });
  });

  describe("setActiveSession", () => {
    it("sets session id", () => {
      useClashStore.getState().setActiveSession("session-123");
      expect(useClashStore.getState().activeSessionId).toBe("session-123");
    });

    it("clears session id", () => {
      useClashStore.getState().setActiveSession("session-123");
      useClashStore.getState().setActiveSession(null);
      expect(useClashStore.getState().activeSessionId).toBeNull();
    });
  });

  describe("addPlayer", () => {
    it("adds a player to your team", () => {
      const player = makePlayer("TOP", "Player1");
      useClashStore.getState().addPlayer("your", "TOP", player);

      const state = useClashStore.getState();
      expect(state.yourTeam[0]).not.toBeNull();
      expect(state.yourTeam[0]!.game_name).toBe("Player1");
      expect(state.yourTeam[0]!.role).toBe("TOP");
    });

    it("adds a player to opponent team", () => {
      const player = makePlayer("MID", "Enemy1");
      useClashStore.getState().addPlayer("opponent", "MID", player);

      const state = useClashStore.getState();
      expect(state.opponentTeam[2]).not.toBeNull();
      expect(state.opponentTeam[2]!.game_name).toBe("Enemy1");
    });

    it("places players in correct role slots", () => {
      const store = useClashStore.getState();
      store.addPlayer("your", "TOP", makePlayer("TOP", "Top"));
      store.addPlayer("your", "JUNGLE", makePlayer("JUNGLE", "Jg"));
      store.addPlayer("your", "MID", makePlayer("MID", "Mid"));
      store.addPlayer("your", "BOT", makePlayer("BOT", "Bot"));
      store.addPlayer("your", "SUPPORT", makePlayer("SUPPORT", "Sup"));

      const state = useClashStore.getState();
      expect(state.yourTeam[0]!.game_name).toBe("Top");
      expect(state.yourTeam[1]!.game_name).toBe("Jg");
      expect(state.yourTeam[2]!.game_name).toBe("Mid");
      expect(state.yourTeam[3]!.game_name).toBe("Bot");
      expect(state.yourTeam[4]!.game_name).toBe("Sup");
    });

    it("replaces existing player in same slot", () => {
      const store = useClashStore.getState();
      store.addPlayer("your", "TOP", makePlayer("TOP", "Old"));
      store.addPlayer("your", "TOP", makePlayer("TOP", "New"));

      expect(useClashStore.getState().yourTeam[0]!.game_name).toBe("New");
    });
  });

  describe("removePlayer", () => {
    it("removes a player from a role slot", () => {
      const store = useClashStore.getState();
      store.addPlayer("your", "MID", makePlayer("MID", "Mid"));
      expect(useClashStore.getState().yourTeam[2]).not.toBeNull();

      store.removePlayer("your", "MID");
      expect(useClashStore.getState().yourTeam[2]).toBeNull();
    });

    it("does not affect other slots", () => {
      const store = useClashStore.getState();
      store.addPlayer("your", "TOP", makePlayer("TOP", "Top"));
      store.addPlayer("your", "MID", makePlayer("MID", "Mid"));
      store.removePlayer("your", "MID");

      const state = useClashStore.getState();
      expect(state.yourTeam[0]!.game_name).toBe("Top");
      expect(state.yourTeam[2]).toBeNull();
    });
  });

  describe("setSelectedChampion", () => {
    it("sets champion on an existing player", () => {
      const store = useClashStore.getState();
      store.addPlayer("your", "TOP", makePlayer("TOP", "Top"));
      store.setSelectedChampion("your", "TOP", { id: 86, name: "Garen" });

      const player = useClashStore.getState().yourTeam[0]!;
      expect(player.selected_champion).toEqual({ id: 86, name: "Garen" });
    });

    it("clears champion selection", () => {
      const store = useClashStore.getState();
      store.addPlayer("your", "TOP", makePlayer("TOP", "Top"));
      store.setSelectedChampion("your", "TOP", { id: 86, name: "Garen" });
      store.setSelectedChampion("your", "TOP", undefined);

      expect(useClashStore.getState().yourTeam[0]!.selected_champion).toBeUndefined();
    });

    it("does nothing if slot is empty", () => {
      useClashStore.getState().setSelectedChampion("your", "TOP", { id: 86, name: "Garen" });
      expect(useClashStore.getState().yourTeam[0]).toBeNull();
    });
  });

  describe("resetTeams", () => {
    it("clears all players and session", () => {
      const store = useClashStore.getState();
      store.addPlayer("your", "TOP", makePlayer("TOP", "Top"));
      store.addPlayer("opponent", "MID", makePlayer("MID", "Mid"));
      store.setActiveSession("session-1");

      store.resetTeams();

      const state = useClashStore.getState();
      expect(state.yourTeam.every((p) => p === null)).toBe(true);
      expect(state.opponentTeam.every((p) => p === null)).toBe(true);
      expect(state.activeSessionId).toBeNull();
    });
  });
});
