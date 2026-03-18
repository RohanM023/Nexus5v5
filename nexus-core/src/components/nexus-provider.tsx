import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { NexusAPIClient } from "../lib/api-client";
import { applyTheme, defaultTheme } from "../theme";
import type { NexusConfig, NexusTheme } from "../types";

interface NexusContextValue {
  client: NexusAPIClient;
  theme: NexusTheme;
}

export const NexusContext = createContext<NexusContextValue | null>(null);

interface NexusProviderProps {
  config: NexusConfig;
  children: ReactNode;
}

/**
 * Wraps your app (or a subtree) to provide the Nexus API client and theme
 * to all Nexus widgets via React context.
 *
 * ```tsx
 * <NexusProvider config={{ apiBaseUrl: "https://api.nexus5v5.com", apiKey: "nxs_..." }}>
 *   <DraftAssistant teamPuuids={["puuid1", "puuid2"]} />
 * </NexusProvider>
 * ```
 */
export function NexusProvider({ config, children }: NexusProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useMemo(
    () => ({ ...defaultTheme, ...config.theme }),
    [config.theme],
  );

  const client = useMemo(
    () => new NexusAPIClient(config.apiBaseUrl, config.apiKey),
    [config.apiBaseUrl, config.apiKey],
  );

  useEffect(() => {
    if (containerRef.current) {
      applyTheme(containerRef.current, theme);
    }
  }, [theme]);

  const value = useMemo(() => ({ client, theme }), [client, theme]);

  return (
    <NexusContext.Provider value={value}>
      <div ref={containerRef} className="nexus-root">
        {children}
      </div>
    </NexusContext.Provider>
  );
}
