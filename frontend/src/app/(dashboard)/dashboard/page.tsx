"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/use-auth";
import { StatsOverview } from "@/components/profile/stats-overview";
import { RoleDistributionChart } from "@/components/charts/role-distribution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
import { cn, getChampionIconUrl } from "@/lib/utils";
import { api } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";

export default function DashboardPage() {
  const { profile, isLoading, isAuthenticated } = useAuth();

  const userId = profile?.user.id;
  const performanceQuery = useQuery({
    queryKey: ["performance", userId],
    queryFn: () => api.getPerformance(userId!),
    enabled: !!userId,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-300">Sign in to see your personalized dashboard</p>
        <p className="text-slate-400">
          Or{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            search for a summoner
          </Link>{" "}
          to get started
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading || performanceQuery.isLoading) return <PageLoader message="Loading your dashboard..." />;
  if (!profile) return <ErrorDisplay message="Could not load profile data." />;

  const stats = performanceQuery.data;
  const topChampions = stats?.top_champions ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back, {profile.user.display_name}
        </p>
      </div>

      {stats && <StatsOverview stats={stats} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {stats && <RoleDistributionChart data={stats.role_distribution} />}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Champions</CardTitle>
          <Link
            href="/profile"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View All
          </Link>
        </CardHeader>
        <CardContent>
          {topChampions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No champion data yet. Link your Riot account and play some games.
            </p>
          ) : (
            <div className="space-y-3">
              {topChampions.map((champ) => (
                <div
                  key={champ.champion_id}
                  className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-800/30 p-3"
                >
                  <Image
                    src={getChampionIconUrl(champ.champion_name)}
                    alt={champ.champion_name}
                    width={40}
                    height={40}
                    className="rounded-lg"
                    unoptimized
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {champ.champion_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {champ.games_played} games
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        champ.win_rate >= 0.5
                          ? "text-green-400"
                          : "text-red-400"
                      )}
                    >
                      {(champ.win_rate * 100).toFixed(0)}% WR
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
