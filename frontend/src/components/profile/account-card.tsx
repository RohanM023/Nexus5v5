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
        "flex items-center justify-between rounded-sm p-4 transition-colors",
        account.verified
          ? "bg-emerald-500/[0.03]"
          : "bg-[var(--color-surface)]"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-sm font-mono text-sm font-bold",
            account.is_primary
              ? "bg-amber-600 text-black"
              : "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
          )}
        >
          {account.game_name[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {account.game_name}
              <span className="text-[var(--color-text-muted)]">#{account.tag_line}</span>
            </span>
            {account.is_primary && (
              <span className="font-mono text-[7px] tracking-[0.2em] uppercase text-amber-500">
                Primary
              </span>
            )}
            {account.verified && (
              <span className="font-mono text-[7px] tracking-[0.2em] uppercase text-emerald-500">
                Verified
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
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
