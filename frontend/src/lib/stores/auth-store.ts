import { create } from "zustand";
import type { AuthTokens, User } from "@/types";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (tokens: AuthTokens | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,

  setTokens: (tokens) =>
    set({
      tokens,
      isAuthenticated: !!tokens,
    }),

  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ isLoading: loading }),

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nexus_access_token");
      localStorage.removeItem("nexus_refresh_token");
    }
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initialize: () => {
    const state = get();
    if (!state.isLoading && state.tokens) return;

    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    const accessToken = localStorage.getItem("nexus_access_token");
    const refreshToken = localStorage.getItem("nexus_refresh_token");

    if (accessToken && refreshToken) {
      set({
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "bearer",
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
