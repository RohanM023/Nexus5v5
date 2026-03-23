"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const STORAGE_KEY = "nexus-last-seen-patch";

export function PatchBanner() {
  const [dismissed, setDismissed] = useState(true);

  const { data } = useQuery({
    queryKey: ["latest-patch"],
    queryFn: () => api.getLatestPatch(),
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (!data?.patch) return;
    if (typeof window === "undefined") return;

    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      // First visit — silently record current patch, no banner
      localStorage.setItem(STORAGE_KEY, data.patch);
      return;
    }
    if (lastSeen !== data.patch) {
      setDismissed(false);
    }
  }, [data?.patch]);

  if (dismissed || !data?.patch) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, data.patch);
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-center justify-between border-l-2 border-[var(--color-accent)]/40 bg-[var(--color-accent)]/[0.03] px-4 py-2.5">
      <p className="font-mono text-[10px] tracking-wider text-[var(--color-accent-text)]/80">
        <span className="font-bold">NEW PATCH</span> — Patch {data.patch} detected. Analytics data is updating.
      </p>
      <button
        onClick={handleDismiss}
        className="ml-4 shrink-0 font-mono text-[10px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        Dismiss
      </button>
    </div>
  );
}
