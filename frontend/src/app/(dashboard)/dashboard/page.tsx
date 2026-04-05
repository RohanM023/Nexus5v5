"use client";

import { useClashStore } from "@/lib/stores/clash-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import { ModeTabs } from "@/components/dashboard/mode-tabs";
import { ClashView } from "@/components/dashboard/clash-view";
import { SoloQueueView } from "@/components/dashboard/solo-queue-view";
import { MultisearchView } from "@/components/dashboard/multisearch-view";
import { PatchAlerts } from "@/components/dashboard/patch-alerts";

export default function DashboardPage() {
  const { mode, setMode } = useClashStore();
  const { user } = useAuth();
  const { championPool } = useProfile(user?.id);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <div className="flex items-center justify-center">
        <ModeTabs activeMode={mode} onModeChange={setMode} />
      </div>

      {mode === "clash" && <ClashView />}
      {mode === "solo-queue" && <SoloQueueView />}
      {mode === "multisearch" && <MultisearchView />}

      <PatchAlerts championPool={championPool} />
    </div>
  );
}
