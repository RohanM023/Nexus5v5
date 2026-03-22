"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LinkAccountRequest } from "@/types";

export function useProfile(userId?: string) {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => (userId ? api.getProfile(userId) : api.getMe()),
    enabled: true,
  });

  const championPoolQuery = useQuery({
    queryKey: ["champion-pool", userId],
    queryFn: () => api.getChampionPool(userId!),
    enabled: !!userId,
  });

  const performanceQuery = useQuery({
    queryKey: ["performance", userId],
    queryFn: () => api.getPerformance(userId!),
    enabled: !!userId,
  });

  const linkAccountMutation = useMutation({
    mutationFn: (data: LinkAccountRequest) => api.linkAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const unlinkAccountMutation = useMutation({
    mutationFn: (accountId: string) => api.unlinkAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const verifyAccountMutation = useMutation({
    mutationFn: (accountId: string) => api.verifyAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return {
    profile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.error,
    championPool: championPoolQuery.data,
    championPoolLoading: championPoolQuery.isLoading,
    performance: performanceQuery.data,
    performanceLoading: performanceQuery.isLoading,
    linkAccount: linkAccountMutation.mutateAsync,
    isLinking: linkAccountMutation.isPending,
    linkError: linkAccountMutation.error,
    unlinkAccount: unlinkAccountMutation.mutateAsync,
    isUnlinking: unlinkAccountMutation.isPending,
    verifyAccount: verifyAccountMutation.mutateAsync,
    isVerifying: verifyAccountMutation.isPending,
  };
}
