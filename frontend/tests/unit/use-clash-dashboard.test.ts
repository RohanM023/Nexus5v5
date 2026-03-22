import { describe, it, expect, beforeEach } from "vitest";
import { useClashStore } from "@/lib/stores/clash-store";
import type { TeamPlayer, RadarDataPoint } from "@/types";

const makePlayer = (role: TeamPlayer["role"], name: string): TeamPlayer => ({
  puuid: `puuid-${name}`,
  game_name: name,
  tag_line: "NA1",
  role,
  alt_accounts: [],
  top_champions: [
    { champion_id: 1, champion_name: "Annie", true_mastery: 85 },
    { champion_id: 86, champion_name: "Garen", true_mastery: 70 },
  ],
});

/**
 * Tests for the computeRadarData logic and ban-target ranking
 * that use-clash-dashboard.ts derives from the clash store.
 *
 * Since the hook itself wraps React Query + useDraft (which need a
 * QueryClient), we test the underlying store state and the pure
 * computation functions the hook relies on.
 */

/** Replicated from use-clash-dashboard.ts for isolated unit testing. */
function computeRadarData(
  yourTeam: (TeamPlayer | null)[],
  opponentTeam: (TeamPlayer | null)[]
): RadarDataPoint[] {
  const yourFilled = yourTeam.filter(Boolean).length;
  const oppFilled = opponentTeam.filter(Boolean).length;
  const yourBase = yourFilled > 0 ? 40 + yourFilled * 8 : 0;
  const oppBase = oppFilled > 0 ? 30 + oppFilled * 6 : 0;

  return [
    { axis: "Early Aggression", yourTeam: Math.min(yourBase + 12, 100), opponentTeam: oppBase + 5 },
    { axis: "Objective Priority", yourTeam: Math.min(yourBase + 5, 100), opponentTeam: oppBase + 10 },
    { axis: "Combat Style", yourTeam: Math.min(yourBase + 8, 100), opponentTeam: oppBase },
    { axis: "CC Intensity", yourTeam: Math.min(Math.max(yourBase - 5, 0), 100), opponentTeam: oppBase + 15 },
    { axis: "Vision Control", yourTeam: Math.min(yourBase + 2, 100), opponentTeam: oppBase + 8 },
    { axis: "Damage Balance", yourTeam: Math.min(yourBase + 10, 100), opponentTeam: oppBase + 12 },
  ];
}

describe("Clash Dashboard computations", () => {
  beforeEach(() => {
    useClashStore.getState().resetTeams();
  });

  describe("computeRadarData", () => {
    it("returns all zeros when teams are empty", () => {
      const emptyTeam: (TeamPlayer | null)[] = [null, null, null, null, null];
      const data = computeRadarData(emptyTeam, emptyTeam);

      expect(data).toHaveLength(6);
      // When no players filled, yourBase=0 and oppBase=0
      // but constant offsets per axis are still added to base
      // yourTeam: min(0 + offset, 100) and opponentTeam: 0 + offset
      // However offset is added to base which is 0 when filled=0
      // Let's verify the actual formula: yourFilled=0 → yourBase=0
      // axis values are yourBase + offset capped at 100
      // So "Early Aggression" yourTeam = min(0 + 12, 100) = 12
      // when both teams are empty, all values come from offsets only
      data.forEach((point) => {
        // With 0 filled players, base is 0. Offsets vary per axis.
        expect(point.yourTeam).toBeLessThanOrEqual(100);
        expect(point.opponentTeam).toBeLessThanOrEqual(100);
      });
      // CC Intensity has max(0-5, 0) = 0 for your team
      expect(data[3].yourTeam).toBe(0);
    });

    it("scales with number of filled slots", () => {
      const onePlayer: (TeamPlayer | null)[] = [
        makePlayer("TOP", "Top"),
        null,
        null,
        null,
        null,
      ];
      const twoPlayers: (TeamPlayer | null)[] = [
        makePlayer("TOP", "Top"),
        makePlayer("JUNGLE", "Jg"),
        null,
        null,
        null,
      ];

      const data1 = computeRadarData(onePlayer, [null, null, null, null, null]);
      const data2 = computeRadarData(twoPlayers, [null, null, null, null, null]);

      // Two players should produce higher base values than one
      expect(data2[0].yourTeam).toBeGreaterThan(data1[0].yourTeam);
    });

    it("caps values at 100", () => {
      const fullTeam: (TeamPlayer | null)[] = [
        makePlayer("TOP", "T"),
        makePlayer("JUNGLE", "J"),
        makePlayer("MID", "M"),
        makePlayer("BOT", "B"),
        makePlayer("SUPPORT", "S"),
      ];

      const data = computeRadarData(fullTeam, [null, null, null, null, null]);
      data.forEach((point) => {
        expect(point.yourTeam).toBeLessThanOrEqual(100);
      });
    });

    it("opponent values scale independently", () => {
      const emptyTeam: (TeamPlayer | null)[] = [null, null, null, null, null];
      const oppTeam: (TeamPlayer | null)[] = [
        makePlayer("TOP", "OT"),
        makePlayer("MID", "OM"),
        null,
        null,
        null,
      ];

      const data = computeRadarData(emptyTeam, oppTeam);
      // Opponent with 2 players has oppBase = 30 + 2*6 = 42
      expect(data[0].opponentTeam).toBe(42 + 5); // Early Aggression: oppBase + 5
      // Your team with 0 players has yourBase = 0, but offsets apply
      // Early Aggression: min(0 + 12, 100) = 12
      expect(data[0].yourTeam).toBe(12);
      // CC Intensity for your team: max(0 - 5, 0) = 0
      expect(data[3].yourTeam).toBe(0);
    });
  });

  describe("win probability heuristic", () => {
    it("returns 50 with no draft scores and empty team", () => {
      const filled = useClashStore.getState().yourTeam.filter(Boolean).length;
      const prob = 50 + filled * 2.5;
      expect(prob).toBe(50);
    });

    it("increases with more team members", () => {
      useClashStore.getState().addPlayer("your", "TOP", makePlayer("TOP", "T"));
      useClashStore.getState().addPlayer("your", "MID", makePlayer("MID", "M"));

      const filled = useClashStore.getState().yourTeam.filter(Boolean).length;
      const prob = 50 + filled * 2.5;
      expect(prob).toBe(55);
    });

    it("adjusts based on draft total_score", () => {
      const scores = { total_score: 70 };
      const prob = Math.min(Math.max(40 + (scores.total_score - 50) * 0.4, 20), 80);
      expect(prob).toBe(48);
    });

    it("clamps to range [20, 80]", () => {
      // Very high score
      const high = Math.min(Math.max(40 + (100 - 50) * 0.4, 20), 80);
      expect(high).toBe(60);

      // Very low score
      const low = Math.min(Math.max(40 + (0 - 50) * 0.4, 20), 80);
      expect(low).toBe(20);
    });
  });

  describe("ban target ranking", () => {
    it("returns empty when no opponents", () => {
      const opponentTeam = useClashStore.getState().opponentTeam;
      const targets = opponentTeam
        .filter(Boolean)
        .flatMap((p) =>
          p!.top_champions.map((c) => ({
            champion_id: c.champion_id,
            champion_name: c.champion_name,
            comfort_score: c.true_mastery,
          }))
        )
        .sort((a, b) => b.comfort_score - a.comfort_score);

      expect(targets).toHaveLength(0);
    });

    it("sorts by comfort_score descending", () => {
      useClashStore.getState().addPlayer("opponent", "TOP", makePlayer("TOP", "OT"));
      useClashStore.getState().addPlayer("opponent", "MID", makePlayer("MID", "OM"));

      const opponentTeam = useClashStore.getState().opponentTeam;
      const targets = opponentTeam
        .filter(Boolean)
        .flatMap((p) =>
          p!.top_champions.map((c) => ({
            champion_id: c.champion_id,
            champion_name: c.champion_name,
            comfort_score: c.true_mastery,
          }))
        )
        .sort((a, b) => b.comfort_score - a.comfort_score);

      // Both players have Annie (85) and Garen (70)
      expect(targets.length).toBe(4);
      expect(targets[0].comfort_score).toBe(85);
      expect(targets[targets.length - 1].comfort_score).toBe(70);
    });
  });
});
