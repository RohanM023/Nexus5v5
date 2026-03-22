"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { LoginRequest, RegisterRequest } from "@/types";
import { useEffect } from "react";

export function useAuth() {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading: isSessionLoading,
    setTokens,
    setUser,
    clearAuth,
    initialize,
  } = useAuthStore();
  const queryClient = useQueryClient();

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Fetch the user's Nexus profile once authenticated
  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(),
    enabled: isAuthenticated && !isSessionLoading,
    retry: false,
  });

  // Sync fetched profile user data into the auth store
  useEffect(() => {
    if (profileQuery.data?.user) {
      setUser(profileQuery.data.user);
    }
  }, [profileQuery.data, setUser]);

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => api.login(data),
    onSuccess: (data) => {
      localStorage.setItem("nexus_access_token", data.access_token);
      localStorage.setItem("nexus_refresh_token", data.refresh_token);
      setTokens(data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => api.register(data),
    onSuccess: (data) => {
      localStorage.setItem("nexus_access_token", data.access_token);
      localStorage.setItem("nexus_refresh_token", data.refresh_token);
      setTokens(data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const signOut = async () => {
    try {
      const refreshToken = localStorage.getItem("nexus_refresh_token");
      await api.logout(refreshToken ?? undefined);
    } catch {
      // Ignore logout errors — always clear local state
    }
    clearAuth();
    queryClient.clear();
  };

  return {
    user,
    tokens,
    isAuthenticated,
    isLoading: isSessionLoading || (isAuthenticated && profileQuery.isLoading),
    profile: profileQuery.data,
    signIn: loginMutation.mutateAsync,
    signInError: loginMutation.error,
    isSigningIn: loginMutation.isPending,
    signUp: registerMutation.mutateAsync,
    signUpError: registerMutation.error,
    isSigningUp: registerMutation.isPending,
    signOut,
  };
}
