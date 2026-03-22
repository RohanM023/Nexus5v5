import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "@/lib/stores/auth-store";

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

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it("starts with no user and loading=true", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.tokens).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  describe("setTokens", () => {
    it("marks authenticated when tokens are provided", () => {
      const fakeTokens = {
        access_token: "tok",
        refresh_token: "ref",
        token_type: "bearer",
      };
      useAuthStore.getState().setTokens(fakeTokens);

      const state = useAuthStore.getState();
      expect(state.tokens).toBe(fakeTokens);
      expect(state.isAuthenticated).toBe(true);
    });

    it("marks unauthenticated when tokens are null", () => {
      useAuthStore.getState().setTokens(null);

      const state = useAuthStore.getState();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("setUser", () => {
    it("stores user data", () => {
      const user = {
        id: "u1",
        email: "test@test.com",
        display_name: "Tester",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      useAuthStore.getState().setUser(user);
      expect(useAuthStore.getState().user).toEqual(user);
    });

    it("clears user with null", () => {
      useAuthStore.getState().setUser({ id: "u1" } as any);
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe("setLoading", () => {
    it("updates loading state", () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);

      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe("clearAuth", () => {
    it("resets all auth state and clears localStorage", () => {
      localStorageMock.setItem("nexus_access_token", "tok");
      localStorageMock.setItem("nexus_refresh_token", "ref");
      useAuthStore.getState().setTokens({
        access_token: "tok",
        refresh_token: "ref",
        token_type: "bearer",
      });
      useAuthStore.getState().setUser({ id: "u1" } as any);

      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("nexus_access_token");
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("nexus_refresh_token");
    });
  });

  describe("initialize", () => {
    it("sets isLoading to false after initialization with no tokens", () => {
      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it("restores auth state from localStorage", () => {
      localStorageMock.setItem("nexus_access_token", "stored-tok");
      localStorageMock.setItem("nexus_refresh_token", "stored-ref");

      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.tokens?.access_token).toBe("stored-tok");
      expect(state.tokens?.refresh_token).toBe("stored-ref");
    });

    it("does not re-initialize if already loaded with tokens", () => {
      useAuthStore.setState({
        isLoading: false,
        tokens: {
          access_token: "existing",
          refresh_token: "existing-ref",
          token_type: "bearer",
        },
        isAuthenticated: true,
      });

      useAuthStore.getState().initialize();

      expect(useAuthStore.getState().tokens?.access_token).toBe("existing");
    });
  });
});
