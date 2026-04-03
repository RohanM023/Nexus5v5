"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { AccountCard } from "@/components/profile/account-card";
import { PlatformConnectionCard } from "@/components/profile/platform-connection-card";
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
          <CardTitle>Connected Platforms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <PlatformConnectionCard
            name="League of Legends"
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12.534 21.77l-1.09-2.81 10.52-3.86V4.22l-19.93 6.2v8.85l5.63 3.17 2.7-3.39-3.94-2.18v-3.07l2.97-1.07v3.6l3.12 1.7Zm9.43-19.77L2.036 8.26l-.07 12.15 3.24 1.83L24 14.67l-.036-12.67Z" />
              </svg>
            }
            connected={(profile?.accounts?.length ?? 0) > 0}
            connectedLabel={
              profile?.accounts?.find((a) => a.is_primary)
                ? `${profile.accounts.find((a) => a.is_primary)!.game_name}#${profile.accounts.find((a) => a.is_primary)!.tag_line}`
                : profile?.accounts?.[0]
                  ? `${profile.accounts[0].game_name}#${profile.accounts[0].tag_line}`
                  : undefined
            }
          />
          <PlatformConnectionCard
            name="Discord"
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            }
            connected={false}
            onConnect={() => alert("Discord integration coming soon.")}
          />
          <PlatformConnectionCard
            name="Twitch"
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
              </svg>
            }
            connected={false}
            onConnect={() => alert("Twitch integration coming soon.")}
          />
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
