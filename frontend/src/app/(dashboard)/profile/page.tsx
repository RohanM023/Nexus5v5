"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { StatsOverview } from "@/components/profile/stats-overview";
import { ChampionPoolGrid } from "@/components/profile/champion-pool-grid";
import { AccountCard } from "@/components/profile/account-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
import Link from "next/link";

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const {
    profile,
    profileLoading,
    profileError,
    championPool,
    performance,
    verifyAccount,
    isVerifying,
  } = useProfile(user?.id);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-300">Sign in to view your Master Profile</p>
        <p className="text-slate-400">
          Or{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            search for any summoner
          </Link>
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

  if (profileLoading) return <PageLoader message="Loading profile..." />;
  if (profileError || !profile)
    return <ErrorDisplay message="Could not load profile." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Master Profile</h1>
          <p className="mt-1 text-sm text-slate-400">
            {profile.user.display_name} &middot;{" "}
            {profile.accounts.length} linked account
            {profile.accounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Manage Accounts
        </Link>
      </div>

      {performance && <StatsOverview stats={performance} />}

      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.accounts.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No accounts linked.{" "}
              <Link href="/settings" className="text-blue-400 hover:text-blue-300">
                Link one now
              </Link>
            </p>
          ) : (
            profile.accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onVerify={!account.verified ? verifyAccount : undefined}
                isVerifying={isVerifying}
              />
            ))
          )}
        </CardContent>
      </Card>

      {championPool && <ChampionPoolGrid champions={championPool.champions} />}
    </div>
  );
}
