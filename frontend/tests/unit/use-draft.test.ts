import { describe, it, expect, beforeEach } from "vitest";
import { useDraftStore } from "@/lib/stores/draft-store";
import type { DraftPick, DraftBan, DraftScores, ChampionSuggestion } from "@/types";

describe("useDraftStore", () => {
  beforeEach(() => {
    useDraftStore.getState().reset();
  });

  it("starts in idle state with empty draft", () => {
    const state = useDraftStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.mode).toBe("clash");
    expect(state.status).toBe("idle");
    expect(state.bluePicks).toHaveLength(0);
    expect(state.redPicks).toHaveLength(0);
    expect(state.blueBans).toHaveLength(0);
    expect(state.redBans).toHaveLength(0);
    expect(state.currentPhase).toBe("ban_phase_1");
    expect(state.scores).toBeNull();
    expect(state.suggestions).toHaveLength(0);
    expect(state.activeSide).toBe("blue");
  });

  describe("setSession", () => {
    it("sets session id and mode, transitions to in_progress", () => {
      useDraftStore.getState().setSession("sess-1", "scrim");

      const state = useDraftStore.getState();
      expect(state.sessionId).toBe("sess-1");
      expect(state.mode).toBe("scrim");
      expect(state.status).toBe("in_progress");
    });
  });

  describe("picks and bans", () => {
    const pick: DraftPick = {
      champion_id: 1,
      champion_name: "Annie",
      position: 1,
      role: "MID",
    };

    const ban: DraftBan = {
      champion_id: 86,
      champion_name: "Garen",
      position: 1,
    };

    it("adds blue picks", () => {
      useDraftStore.getState().addBluePick(pick);
      expect(useDraftStore.getState().bluePicks).toHaveLength(1);
      expect(useDraftStore.getState().bluePicks[0].champion_name).toBe("Annie");
    });

    it("adds red picks", () => {
      useDraftStore.getState().addRedPick(pick);
      expect(useDraftStore.getState().redPicks).toHaveLength(1);
    });

    it("adds blue bans", () => {
      useDraftStore.getState().addBlueBan(ban);
      expect(useDraftStore.getState().blueBans).toHaveLength(1);
      expect(useDraftStore.getState().blueBans[0].champion_name).toBe("Garen");
    });

    it("adds red bans", () => {
      useDraftStore.getState().addRedBan(ban);
      expect(useDraftStore.getState().redBans).toHaveLength(1);
    });

    it("accumulates multiple picks", () => {
      const store = useDraftStore.getState();
      store.addBluePick({ ...pick, champion_id: 1, champion_name: "Annie", position: 1 });
      store.addBluePick({ ...pick, champion_id: 2, champion_name: "Ahri", position: 2 });
      store.addBluePick({ ...pick, champion_id: 3, champion_name: "Ashe", position: 3 });

      expect(useDraftStore.getState().bluePicks).toHaveLength(3);
    });
  });

  describe("setPhase", () => {
    it("updates the current phase", () => {
      useDraftStore.getState().setPhase("pick_phase_2");
      expect(useDraftStore.getState().currentPhase).toBe("pick_phase_2");
    });
  });

  describe("setScores", () => {
    it("stores draft scores", () => {
      const scores: DraftScores = {
        synergy_score: 72.5,
        counter_score: 60.0,
        comfort_scores: [
          { puuid: "p1", champion_id: 1, champion_name: "Annie", comfort_score: 85 },
        ],
        total_score: 68.3,
      };

      useDraftStore.getState().setScores(scores);

      const state = useDraftStore.getState();
      expect(state.scores).not.toBeNull();
      expect(state.scores!.total_score).toBe(68.3);
      expect(state.scores!.comfort_scores).toHaveLength(1);
    });
  });

  describe("setSuggestions", () => {
    it("stores champion suggestions", () => {
      const suggestions: ChampionSuggestion[] = [
        {
          champion_id: 1,
          champion_name: "Annie",
          composite_score: 82,
          synergy_contribution: 30,
          counter_contribution: 28,
          comfort_contribution: 24,
        },
      ];

      useDraftStore.getState().setSuggestions(suggestions);
      expect(useDraftStore.getState().suggestions).toHaveLength(1);
      expect(useDraftStore.getState().suggestions[0].composite_score).toBe(82);
    });
  });

  describe("setActiveSide", () => {
    it("switches active side", () => {
      useDraftStore.getState().setActiveSide("red");
      expect(useDraftStore.getState().activeSide).toBe("red");
    });
  });

  describe("updateFromSession", () => {
    it("updates store from server session data", () => {
      const session = {
        blue_picks: [
          { champion_id: 1, champion_name: "Annie", position: 1, role: "MID" },
        ],
        red_picks: [],
        blue_bans: [{ champion_id: 86, champion_name: "Garen", position: 1 }],
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

    it("sets status to completed when session is completed", () => {
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
    it("returns store to initial state", () => {
      const store = useDraftStore.getState();
      store.setSession("sess-1", "clash");
      store.addBluePick({
        champion_id: 1,
        champion_name: "Annie",
        position: 1,
        role: "MID",
      });
      store.setScores({
        synergy_score: 50,
        counter_score: 50,
        comfort_scores: [],
        total_score: 50,
      });

      store.reset();

      const state = useDraftStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.status).toBe("idle");
      expect(state.bluePicks).toHaveLength(0);
      expect(state.scores).toBeNull();
    });
  });
});
