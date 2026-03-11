"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { StatsOverview } from "@/components/profile/stats-overview";
import { RoleDistributionChart } from "@/components/charts/role-distribution";
import { PerformanceTrend } from "@/components/charts/performance-trend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
import { cn, formatKDA, formatTimeAgo, getChampionIconUrl } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export default function DashboardPage() {
  const { profile, isLoading, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-slate-400">Please sign in to view your dashboard.</p>
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading) return <PageLoader message="Loading your dashboard..." />;
  if (!profile) return <ErrorDisplay message="Could not load profile data." />;

  const { stats } = profile;
  const recentMatches = stats.top_champions.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back, {profile.user.display_name}
        </p>
      </div>

      <StatsOverview stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RoleDistributionChart data={stats.role_distribution} />
        <PerformanceTrend data={stats.recent_form} />
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
          {recentMatches.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No champion data yet. Link your Riot account and play some games.
            </p>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((champ) => (
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
                      {champ.games_played} games &middot;{" "}
                      {formatTimeAgo(champ.last_played)}
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
                    <p className="text-xs text-slate-500">
                      {formatKDA(
                        Math.round(champ.avg_kda),
                        1,
                        Math.round(champ.avg_kda)
                      )}{" "}
                      KDA
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${champ.true_mastery}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-center text-[10px] text-slate-500">
                      Mastery {Math.round(champ.true_mastery)}
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
