"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { AccountCard } from "@/components/profile/account-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading";
import Link from "next/link";

const REGIONS = [
  { value: "na1", label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
  { value: "oc1", label: "OCE" },
  { value: "tr1", label: "TR" },
  { value: "ru", label: "RU" },
  { value: "jp1", label: "JP" },
] as const;

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const {
    profile,
    profileLoading,
    linkAccount,
    isLinking,
    linkError,
    unlinkAccount,
    isUnlinking,
    verifyAccount,
    isVerifying,
  } = useProfile(user?.id);

  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("na1");
  const [linkSuccess, setLinkSuccess] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-xs text-[var(--color-text-muted)]">Sign in to access settings.</p>
        <Link
          href="/login"
          className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-500"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (profileLoading) return <PageLoader message="Loading..." />;

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkSuccess(false);
    try {
      await linkAccount({
        game_name: gameName,
        tag_line: tagLine,
        region,
      });
      setGameName("");
      setTagLine("");
      setLinkSuccess(true);
    } catch {
      // Error handled via linkError
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Manage your account and linked Riot accounts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Display Name"
              value={profile?.user.display_name || ""}
              disabled
            />
            <Input
              label="Email"
              value={profile?.user.email || ""}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link Riot Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLinkAccount} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Game Name"
                placeholder="Faker"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                required
              />
              <Input
                label="Tag Line"
                placeholder="KR1"
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                required
              />
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-medium tracking-wider uppercase text-[var(--color-text-muted)]">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full border-b border-[var(--color-border)] bg-transparent py-2 text-sm text-white focus:border-amber-600 focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value} className="bg-[var(--color-surface)]">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {linkError && (
              <div className="border-l-2 border-red-500/60 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                {linkError.message}
              </div>
            )}

            {linkSuccess && (
              <div className="border-l-2 border-emerald-500/60 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
                Account linked. Verify it below.
              </div>
            )}

            <Button type="submit" isLoading={isLinking}>
              Link Account
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!profile?.accounts.length ? (
            <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">
              No accounts linked yet.
            </p>
          ) : (
            profile.accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onVerify={!account.verified ? verifyAccount : undefined}
                onUnlink={() => unlinkAccount(account.id)}
                isVerifying={isVerifying}
                isUnlinking={isUnlinking}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-xs text-[var(--color-text-secondary)]">
            <li>Click &quot;Verify&quot; next to the account you want to verify.</li>
            <li>The system will assign a specific summoner icon to equip.</li>
            <li>Open League of Legends, change your summoner icon to the assigned one.</li>
            <li>Return here and click &quot;Verify&quot; again to confirm.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
