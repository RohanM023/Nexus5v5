import { describe, it, expect, beforeEach } from "vitest";
import { useDraftStore } from "@/lib/stores/draft-store";

describe("useDraftStore", () => {
  beforeEach(() => {
    useDraftStore.getState().reset();
  });

  it("starts in idle state", () => {
    const state = useDraftStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.status).toBe("idle");
    expect(state.mode).toBe("clash");
    expect(state.currentPhase).toBe("ban_phase_1");
    expect(state.bluePicks).toEqual([]);
    expect(state.redPicks).toEqual([]);
    expect(state.blueBans).toEqual([]);
    expect(state.redBans).toEqual([]);
    expect(state.scores).toBeNull();
    expect(state.suggestions).toEqual([]);
    expect(state.activeSide).toBe("blue");
  });

  describe("setSession", () => {
    it("sets session id, mode, and moves to in_progress", () => {
      useDraftStore.getState().setSession("sess-1", "scrim");
      const state = useDraftStore.getState();
      expect(state.sessionId).toBe("sess-1");
      expect(state.mode).toBe("scrim");
      expect(state.status).toBe("in_progress");
    });
  });

  describe("picks and bans", () => {
    it("adds blue picks", () => {
      const pick = { champion_id: 1, champion_name: "Annie", position: 1, role: "MID" };
      useDraftStore.getState().addBluePick(pick);
      expect(useDraftStore.getState().bluePicks).toHaveLength(1);
      expect(useDraftStore.getState().bluePicks[0]).toEqual(pick);
    });

    it("adds red picks", () => {
      const pick = { champion_id: 86, champion_name: "Garen", position: 1, role: "TOP" };
      useDraftStore.getState().addRedPick(pick);
      expect(useDraftStore.getState().redPicks).toHaveLength(1);
    });

    it("adds blue bans", () => {
      const ban = { champion_id: 238, champion_name: "Zed", position: 1 };
      useDraftStore.getState().addBlueBan(ban);
      expect(useDraftStore.getState().blueBans).toHaveLength(1);
    });

    it("adds red bans", () => {
      const ban = { champion_id: 157, champion_name: "Yasuo", position: 1 };
      useDraftStore.getState().addRedBan(ban);
      expect(useDraftStore.getState().redBans).toHaveLength(1);
    });

    it("accumulates multiple picks", () => {
      const store = useDraftStore.getState();
      store.addBluePick({ champion_id: 1, champion_name: "Annie", position: 1, role: "MID" });
      store.addBluePick({ champion_id: 86, champion_name: "Garen", position: 3, role: "TOP" });
      expect(useDraftStore.getState().bluePicks).toHaveLength(2);
    });
  });

  describe("setPhase", () => {
    it("updates current phase", () => {
      useDraftStore.getState().setPhase("pick_phase_1");
      expect(useDraftStore.getState().currentPhase).toBe("pick_phase_1");
    });
  });

  describe("setScores", () => {
    it("sets draft scores", () => {
      const scores = {
        synergy_score: 65,
        counter_score: 55,
        comfort_scores: [],
        total_score: 60,
      };
      useDraftStore.getState().setScores(scores);
      expect(useDraftStore.getState().scores).toEqual(scores);
    });
  });

  describe("setSuggestions", () => {
    it("sets champion suggestions", () => {
      const suggestions = [
        {
          champion_id: 1,
          champion_name: "Annie",
          composite_score: 78,
          synergy_contribution: 30,
          counter_contribution: 28,
          comfort_contribution: 20,
        },
      ];
      useDraftStore.getState().setSuggestions(suggestions);
      expect(useDraftStore.getState().suggestions).toHaveLength(1);
    });
  });

  describe("setActiveSide", () => {
    it("switches active side", () => {
      useDraftStore.getState().setActiveSide("red");
      expect(useDraftStore.getState().activeSide).toBe("red");
    });
  });

  describe("updateFromSession", () => {
    it("updates state from a server session response", () => {
      const session = {
        blue_picks: [{ champion_id: 1, champion_name: "Annie", position: 1, role: "MID" }],
        red_picks: [],
        blue_bans: [{ champion_id: 238, champion_name: "Zed", position: 1 }],
        red_bans: [],
        current_phase: "pick_phase_1" as const,
        status: "in_progress" as const,
      };

      useDraftStore.getState().updateFromSession(session);
      const state = useDraftStore.getState();
      expect(state.bluePicks).toHaveLength(1);
      expect(state.blueBans).toHaveLength(1);
      expect(state.currentPhase).toBe("pick_phase_1");
      expect(state.status).toBe("in_progress");
    });

    it("marks completed sessions", () => {
      useDraftStore.getState().updateFromSession({
        blue_picks: [],
        red_picks: [],
        blue_bans: [],
        red_bans: [],
        current_phase: "completed",
        status: "completed",
      });
      expect(useDraftStore.getState().status).toBe("completed");
    });
  });

  describe("reset", () => {
    it("resets all state to defaults", () => {
      const store = useDraftStore.getState();
      store.setSession("sess-1", "scrim");
      store.addBluePick({ champion_id: 1, champion_name: "Annie", position: 1, role: "MID" });
      store.setScores({ synergy_score: 60, counter_score: 50, comfort_scores: [], total_score: 55 });

      store.reset();

      const state = useDraftStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.status).toBe("idle");
      expect(state.bluePicks).toEqual([]);
      expect(state.scores).toBeNull();
    });
  });
});
