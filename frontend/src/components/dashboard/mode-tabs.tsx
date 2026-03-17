"use client";

import { cn } from "@/lib/utils";
import type { DashboardMode } from "@/types";

interface ModeTabsProps {
  activeMode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

const TABS: { value: DashboardMode; label: string }[] = [
  { value: "solo-queue", label: "SOLO QUEUE" },
  { value: "multisearch", label: "MULTISEARCH" },
  { value: "clash", label: "CLASH/5V5" },
];

export function ModeTabs({ activeMode, onModeChange }: ModeTabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onModeChange(tab.value)}
          className={cn(
            "rounded-md px-5 py-2 text-sm font-semibold tracking-wide transition-all",
            activeMode === tab.value
              ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
