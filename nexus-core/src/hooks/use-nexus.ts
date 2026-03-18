import { useContext } from "react";
import { NexusContext } from "../components/nexus-provider";
import type { NexusAPIClient } from "../lib/api-client";
import type { NexusTheme } from "../types";

interface UseNexusReturn {
  client: NexusAPIClient;
  theme: NexusTheme;
}

/** Access the Nexus API client and theme from NexusProvider context. */
export function useNexus(): UseNexusReturn {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error("useNexus must be used within a <NexusProvider>");
  }
  return context;
}
