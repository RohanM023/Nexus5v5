import type { NexusTheme } from "./types";

export const defaultTheme: NexusTheme = {
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  backgroundColor: "#0f1117",
  surfaceColor: "#1a1d2e",
  textColor: "#f1f5f9",
  textMutedColor: "#94a3b8",
  borderColor: "#2d3348",
  successColor: "#22c55e",
  warningColor: "#f59e0b",
  dangerColor: "#ef4444",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  borderRadius: "8px",
};

/** Inject theme tokens as CSS custom properties on a container element. */
export function applyTheme(
  element: HTMLElement,
  theme: NexusTheme,
): void {
  const props: Record<string, string> = {
    "--nexus-primary": theme.primaryColor,
    "--nexus-secondary": theme.secondaryColor,
    "--nexus-bg": theme.backgroundColor,
    "--nexus-surface": theme.surfaceColor,
    "--nexus-text": theme.textColor,
    "--nexus-text-muted": theme.textMutedColor,
    "--nexus-border": theme.borderColor,
    "--nexus-success": theme.successColor,
    "--nexus-warning": theme.warningColor,
    "--nexus-danger": theme.dangerColor,
    "--nexus-font": theme.fontFamily,
    "--nexus-radius": theme.borderRadius,
  };

  for (const [key, value] of Object.entries(props)) {
    element.style.setProperty(key, value);
  }
}
