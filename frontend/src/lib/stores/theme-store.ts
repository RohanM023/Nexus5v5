import { create } from "zustand";
import { themes, getThemeById, type ThemeDefinition, type ThemeColors } from "@/lib/themes";

interface ThemeState {
  themeId: string;
  theme: ThemeDefinition;
  availableThemes: ThemeDefinition[];
  setTheme: (id: string) => void;
  initialize: () => void;
}

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  background: "--background",
  foreground: "--foreground",
  surface: "--color-surface",
  surfaceHover: "--color-surface-hover",
  border: "--color-border",
  borderHover: "--color-border-hover",
  textPrimary: "--color-text-primary",
  textSecondary: "--color-text-secondary",
  textMuted: "--color-text-muted",
  accent: "--color-accent",
  accentHover: "--color-accent-hover",
  accentText: "--color-accent-text",
  accentBg: "--color-accent-bg",
  accentBgHover: "--color-accent-bg-hover",
  danger: "--color-danger",
  dangerBg: "--color-danger-bg",
  success: "--color-success",
  successBg: "--color-success-bg",
  warning: "--color-warning",
  warningBg: "--color-warning-bg",
  teamBlue: "--color-team-blue",
  teamBlueBg: "--color-team-blue-bg",
  teamRed: "--color-team-red",
  teamRedBg: "--color-team-red-bg",
  tierS: "--color-tier-s",
  tierSBg: "--color-tier-s-bg",
  tierA: "--color-tier-a",
  tierABg: "--color-tier-a-bg",
  tierB: "--color-tier-b",
  tierBBg: "--color-tier-b-bg",
  tierC: "--color-tier-c",
  tierCBg: "--color-tier-c-bg",
  scoreHigh: "--color-score-high",
  scoreHighBg: "--color-score-high-bg",
  scoreMid: "--color-score-mid",
  scoreMidBg: "--color-score-mid-bg",
  scoreLow: "--color-score-low",
  scoreLowBg: "--color-score-low-bg",
  scorePoor: "--color-score-poor",
  scorePoorBg: "--color-score-poor-bg",
  chartGrid: "--color-chart-grid",
  chartAxis: "--color-chart-axis",
  chartTick: "--color-chart-tick",
  chartPrimary: "--color-chart-primary",
  chartSecondary: "--color-chart-secondary",
  chartTooltipBg: "--color-chart-tooltip-bg",
  chartTooltipBorder: "--color-chart-tooltip-border",
  selectionBg: "--color-selection-bg",
  selectionText: "--color-selection-text",
};

function applyTheme(theme: ThemeDefinition) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, theme.colors[key as keyof ThemeColors]);
  }
  root.setAttribute("data-theme", theme.id);
  root.setAttribute("data-theme-category", theme.category);
}

const defaultTheme = getThemeById("void");

export const useThemeStore = create<ThemeState>()((set) => ({
  themeId: defaultTheme.id,
  theme: defaultTheme,
  availableThemes: themes,

  setTheme: (id: string) => {
    const theme = getThemeById(id);
    applyTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem("nexus-theme", id);
    }
    set({ themeId: theme.id, theme });
  },

  initialize: () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("nexus-theme");
    const theme = stored ? getThemeById(stored) : defaultTheme;
    applyTheme(theme);
    set({ themeId: theme.id, theme });
  },
}));
