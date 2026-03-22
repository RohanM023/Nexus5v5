"use client";

import { cn } from "@/lib/utils";
import type { DashboardMode } from "@/types";

interface ModeTabsProps {
  activeMode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

const TABS: { value: DashboardMode; label: string }[] = [
  { value: "solo-queue", label: "Solo Queue" },
  { value: "multisearch", label: "Multisearch" },
  { value: "clash", label: "Clash / 5v5" },
];

export function ModeTabs({ activeMode, onModeChange }: ModeTabsProps) {
  return (
    <div className="flex items-center gap-6">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onModeChange(tab.value)}
          className={cn(
            "relative pb-2 text-xs font-medium tracking-wide transition-colors",
            activeMode === tab.value
              ? "text-white"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          )}
        >
          {tab.label}
          {activeMode === tab.value && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-amber-600" />
          )}
        </button>
      ))}
    </div>
  );
}
