import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiError } from "@/lib/api";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("ApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorageMock.clear();
  });

  describe("request headers", () => {
    it("sends Content-Type: application/json on all requests", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok" }), { status: 200 })
      );

      await api.getHealth();

      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/health",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("sends Authorization header when token is in localStorage", async () => {
      localStorageMock.setItem("nexus_access_token", "my-jwt-token");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok" }), { status: 200 })
      );

      await api.getHealth();

      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/health",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-jwt-token",
          }),
        })
      );
    });
  });

  describe("GET requests", () => {
    it("getHealth returns parsed JSON", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "ok", version: "1.0.0", uptime: 3600 }),
          { status: 200 }
        )
      );

      const result = await api.getHealth();
      expect(result.status).toBe("ok");
    });

    it("getRiotQuota fetches quota data", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requests_per_second: 5,
            requests_per_two_minutes: 80,
            limit_per_second: 20,
            limit_per_two_minutes: 100,
          }),
          { status: 200 }
        )
      );

      const result = await api.getRiotQuota();
      expect(result.limit_per_second).toBe(20);
    });
  });

  describe("POST requests", () => {
    it("login sends email and password and returns AuthTokens", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "jwt-tok",
            refresh_token: "ref-tok",
            token_type: "bearer",
          }),
          { status: 200 }
        )
      );

      const result = await api.login({ email: "test@test.com", password: "secret123" });

      const [, opts] = vi.mocked(fetch).mock.calls[0];
      expect(opts?.method).toBe("POST");
      expect(JSON.parse(opts?.body as string)).toEqual({
        email: "test@test.com",
        password: "secret123",
      });
      expect(result.access_token).toBe("jwt-tok");
      expect(result.refresh_token).toBe("ref-tok");
    });

    it("register sends email, password, and display_name and returns AuthTokens", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "jwt-tok",
            refresh_token: "ref-tok",
            token_type: "bearer",
          }),
          { status: 200 }
        )
      );

      const result = await api.register({
        email: "new@test.com",
        password: "pass1234",
        display_name: "NewUser",
      });

      const [, opts] = vi.mocked(fetch).mock.calls[0];
      expect(JSON.parse(opts?.body as string).display_name).toBe("NewUser");
      expect(result.access_token).toBe("jwt-tok");
    });

    it("logout sends refresh_token in body", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      await api.logout("my-refresh-token");

      const [, opts] = vi.mocked(fetch).mock.calls[0];
      expect(JSON.parse(opts?.body as string)).toEqual({
        refresh_token: "my-refresh-token",
      });
    });
  });

  describe("match history with query params", () => {
    it("builds query string from optional params", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [], pagination: { cursor: null, has_more: false } }),
          { status: 200 }
        )
      );

      await api.getMatchHistory("puuid-1", "cursor-abc", 420, "Annie");

      const [url] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("/api/match/history/puuid-1");
      expect(url).toContain("cursor=cursor-abc");
      expect(url).toContain("queue=420");
      expect(url).toContain("champion=Annie");
    });

    it("omits empty params", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [], pagination: { cursor: null, has_more: false } }),
          { status: 200 }
        )
      );

      await api.getMatchHistory("puuid-1");

      const [url] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/match/history/puuid-1");
    });
  });

  describe("draft methods", () => {
    it("createDraftSession sends mode and team_id", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "sess-1", mode: "clash", status: "in_progress" }),
          { status: 200 }
        )
      );

      await api.createDraftSession("clash", "team-1");

      const [, opts] = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(opts?.body as string);
      expect(body.mode).toBe("clash");
      expect(body.team_id).toBe("team-1");
    });

    it("getDraftScores fetches scores for session", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            synergy_score: 65,
            counter_score: 55,
            comfort_scores: [],
            total_score: 60,
          }),
          { status: 200 }
        )
      );

      const scores = await api.getDraftScores("sess-1");
      expect(scores.total_score).toBe(60);
    });
  });

  describe("204 No Content", () => {
    it("returns undefined for 204 responses", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      const result = await api.logout();
      expect(result).toBeUndefined();
    });
  });

  describe("ApiError", () => {
    it("has correct status and message", () => {
      const err = new ApiError(403, "Forbidden", "FORBIDDEN");
      expect(err.status).toBe(403);
      expect(err.message).toBe("Forbidden");
      expect(err.code).toBe("FORBIDDEN");
      expect(err.name).toBe("ApiError");
    });

    it("extends Error", () => {
      const err = new ApiError(500, "Internal");
      expect(err).toBeInstanceOf(Error);
    });

    it("thrown by client on error responses", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "RATE_LIMITED", message: "Too many requests" },
          }),
          { status: 429 }
        )
      );

      try {
        await api.getHealth();
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(429);
      }
    });
  });
});
