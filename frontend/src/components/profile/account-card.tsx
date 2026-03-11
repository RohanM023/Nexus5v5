"use client";

import { cn } from "@/lib/utils";
import type { RiotAccount } from "@/types";
import { Button } from "@/components/ui/button";

interface AccountCardProps {
  account: RiotAccount;
  onVerify?: (accountId: string) => void;
  onUnlink?: (accountId: string) => void;
  isVerifying?: boolean;
  isUnlinking?: boolean;
}

export function AccountCard({
  account,
  onVerify,
  onUnlink,
  isVerifying,
  isUnlinking,
}: AccountCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-colors",
        account.verified
          ? "border-green-500/30 bg-green-500/5"
          : "border-slate-700 bg-slate-800/30"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
            account.is_primary
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300"
          )}
        >
          {account.game_name[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {account.game_name}#{account.tag_line}
            </span>
            {account.is_primary && (
              <span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-xs font-medium text-blue-400">
                Primary
              </span>
            )}
            {account.verified && (
              <span className="rounded bg-green-600/20 px-1.5 py-0.5 text-xs font-medium text-green-400">
                Verified
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {account.region.toUpperCase()} &middot; Linked{" "}
            {new Date(account.linked_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!account.verified && onVerify && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onVerify(account.id)}
            isLoading={isVerifying}
          >
            Verify
          </Button>
        )}
        {onUnlink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnlink(account.id)}
            isLoading={isUnlinking}
          >
            Unlink
          </Button>
        )}
      </div>
    </div>
  );
}
