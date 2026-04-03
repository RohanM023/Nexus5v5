"use client";

import { Button } from "@/components/ui/button";

interface PlatformConnectionCardProps {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  connectedLabel?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function PlatformConnectionCard({
  name,
  icon,
  connected,
  connectedLabel,
  onConnect,
  onDisconnect,
}: PlatformConnectionCardProps) {
  return (
    <div className="flex items-center justify-between rounded-sm p-4 transition-colors bg-[var(--color-surface-hover)]/30">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
          {icon}
        </div>
        <div>
          <span className="text-sm font-medium text-white">{name}</span>
          {connected && connectedLabel && (
            <p className="mt-0.5 font-mono text-[9px] text-[var(--color-text-muted)]">
              {connectedLabel}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <span className="font-mono text-[7px] tracking-[0.2em] uppercase text-emerald-500">
              Connected
            </span>
            {onDisconnect && (
              <Button variant="ghost" size="sm" onClick={onDisconnect}>
                Disconnect
              </Button>
            )}
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onConnect}>
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
