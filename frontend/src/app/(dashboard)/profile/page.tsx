"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { StatsOverview } from "@/components/profile/stats-overview";
import { ChampionPoolGrid } from "@/components/profile/champion-pool-grid";
import { AccountCard } from "@/components/profile/account-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
import { PocketPickSuggester } from "@/components/profile/pocket-pick-suggester";
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
        <p className="text-xs text-[var(--color-text-muted)]">Sign in to view your Master Profile</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Or{" "}
          <Link href="/" className="text-[var(--color-accent-text)] hover:text-[var(--color-accent-hover)]">
            search for any summoner
          </Link>
        </p>
        <Link
          href="/login"
          className="rounded-md bg-[var(--color-accent-bg)] px-5 py-2 text-xs font-medium text-black hover:bg-[var(--color-accent-bg-hover)]"
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
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Master Profile</h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
            {profile.user.display_name} · {profile.accounts.length} account{profile.accounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/settings"
          className="text-[10px] tracking-wider uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          Manage
        </Link>
      </div>

      {performance && <StatsOverview stats={performance} />}

      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.accounts.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">
              No accounts linked.{" "}
              <Link href="/settings" className="text-[var(--color-accent-text)] hover:text-[var(--color-accent-hover)]">
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

      {performance && championPool && (
        <PocketPickSuggester performance={performance} championPool={championPool} />
      )}
    </div>
  );
}
