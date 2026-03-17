"use client";

import { useClashStore } from "@/lib/stores/clash-store";
import { ModeTabs } from "@/components/dashboard/mode-tabs";
import { ClashView } from "@/components/dashboard/clash-view";
import { SoloQueueView } from "@/components/dashboard/solo-queue-view";
import { MultisearchView } from "@/components/dashboard/multisearch-view";

export default function DashboardPage() {
  const { mode, setMode } = useClashStore();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Mode tabs */}
      <div className="flex items-center justify-center">
        <ModeTabs activeMode={mode} onModeChange={setMode} />
      </div>

      {/* Active view */}
      {mode === "clash" && <ClashView />}
      {mode === "solo-queue" && <SoloQueueView />}
      {mode === "multisearch" && <MultisearchView />}
    </div>
  );
}
