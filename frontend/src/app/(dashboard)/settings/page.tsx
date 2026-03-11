"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { AccountCard } from "@/components/profile/account-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader, ErrorDisplay } from "@/components/ui/loading";
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
        <p className="text-slate-400">Please sign in to access settings.</p>
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (profileLoading) return <PageLoader message="Loading settings..." />;

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
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
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {linkError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {linkError.message}
              </div>
            )}

            {linkSuccess && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                Account linked successfully. Verify it below.
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
        <CardContent className="space-y-3">
          {!profile?.accounts.length ? (
            <p className="py-4 text-center text-sm text-slate-500">
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
          <CardTitle>Verification Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-400">
            <li>Click &quot;Verify&quot; next to the account you want to verify.</li>
            <li>
              The system will assign a specific summoner icon number for you to
              equip.
            </li>
            <li>
              Open League of Legends, go to your profile, and change your
              summoner icon to the assigned icon.
            </li>
            <li>
              Return here and click &quot;Verify&quot; again. The system will check your
              icon and mark the account as verified.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
