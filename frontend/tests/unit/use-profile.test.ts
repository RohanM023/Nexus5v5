import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiError } from "@/lib/api";

/**
 * Tests for the profile data layer.
 *
 * Since useProfile is a thin React Query wrapper, we test the
 * API client methods it delegates to, plus error class behaviour.
 */

describe("Profile API methods", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("api.getMe", () => {
    it("calls /api/identity/me", async () => {
      const profile = {
        user: { id: "u1", email: "a@b.com", display_name: "Test", created_at: "", updated_at: "" },
        accounts: [],
        total_accounts: 0,
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(profile), { status: 200 })
      );

      const result = await api.getMe();
      expect(result.user.id).toBe("u1");
      expect(fetch).toHaveBeenCalledWith(
        "/api/identity/me",
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });
  });

  describe("api.getProfile", () => {
    it("calls /api/identity/profile/:userId", async () => {
      const profile = {
        user: { id: "u2", email: "b@c.com", display_name: "Other", created_at: "", updated_at: "" },
        accounts: [],
        total_accounts: 0,
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(profile), { status: 200 })
      );

      const result = await api.getProfile("u2");
      expect(result.user.id).toBe("u2");
    });
  });

  describe("api.linkAccount", () => {
    it("sends POST with game_name, tag_line, region", async () => {
      const account = {
        id: "a1",
        user_id: "u1",
        puuid: "p1",
        game_name: "Player",
        tag_line: "NA1",
        region: "na1",
        is_primary: false,
        verified: false,
        verified_at: null,
        linked_at: "",
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(account), { status: 200 })
      );

      const result = await api.linkAccount({
        game_name: "Player",
        tag_line: "NA1",
        region: "na1",
      });

      expect(result.puuid).toBe("p1");
      expect(fetch).toHaveBeenCalledWith(
        "/api/identity/link",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("api.unlinkAccount", () => {
    it("sends DELETE to /api/identity/link/:accountId", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      await api.unlinkAccount("a1");
      expect(fetch).toHaveBeenCalledWith(
        "/api/identity/link/a1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("api.getChampionPool", () => {
    it("returns champion pool for a user", async () => {
      const pool = {
        user_id: "u1",
        champions: [{ champion_id: 1, champion_name: "Annie", games_played: 50 }],
        total_champions: 1,
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(pool), { status: 200 })
      );

      const result = await api.getChampionPool("u1");
      expect(result.total_champions).toBe(1);
    });
  });

  describe("api.getPerformance", () => {
    it("returns performance stats for a user", async () => {
      const stats = {
        user_id: "u1",
        total_games: 100,
        total_wins: 55,
        total_losses: 45,
        overall_win_rate: 0.55,
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(stats), { status: 200 })
      );

      const result = await api.getPerformance("u1");
      expect(result.total_games).toBe(100);
    });
  });

  describe("error handling", () => {
    it("throws ApiError on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: "User not found" } }),
          { status: 404 }
        )
      );

      await expect(api.getProfile("missing")).rejects.toThrow("User not found");
    });

    it("falls back to status code message when body has no error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("", { status: 500 })
      );

      await expect(api.getMe()).rejects.toThrow("Request failed: 500");
    });
  });
});
