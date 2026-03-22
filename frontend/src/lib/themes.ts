// Theme color token interface
export interface ThemeColors {
  // Core
  background: string;
  foreground: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;

  // Accent extended
  accentText: string;
  accentBg: string;
  accentBgHover: string;

  // Semantic
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;

  // Team colors
  teamBlue: string;
  teamBlueBg: string;
  teamRed: string;
  teamRedBg: string;

  // Tier colors
  tierS: string;
  tierSBg: string;
  tierA: string;
  tierABg: string;
  tierB: string;
  tierBBg: string;
  tierC: string;
  tierCBg: string;

  // Score colors
  scoreHigh: string;
  scoreHighBg: string;
  scoreMid: string;
  scoreMidBg: string;
  scoreLow: string;
  scoreLowBg: string;
  scorePoor: string;
  scorePoorBg: string;

  // Chart colors
  chartGrid: string;
  chartAxis: string;
  chartTick: string;
  chartPrimary: string;
  chartSecondary: string;
  chartTooltipBg: string;
  chartTooltipBorder: string;

  // Selection
  selectionBg: string;
  selectionText: string;
}

export type ThemeCategory = "dark" | "light";

export interface ThemeDefinition {
  id: string;
  name: string;
  category: ThemeCategory;
  colors: ThemeColors;
}

const voidTheme: ThemeDefinition = {
  id: "void",
  name: "Void",
  category: "dark",
  colors: {
    background: "#050507",
    foreground: "#d4d4dc",
    surface: "#0a0a0f",
    surfaceHover: "#101016",
    border: "#18181f",
    borderHover: "#222230",
    textPrimary: "#d4d4dc",
    textSecondary: "#b0b0be",
    textMuted: "#9090a0",
    accent: "#d97706",
    accentHover: "#f59e0b",
    accentText: "#d97706",
    accentBg: "#d97706",
    accentBgHover: "#f59e0b",
    danger: "#ef4444",
    dangerBg: "rgba(239,68,68,0.8)",
    success: "#10b981",
    successBg: "rgba(16,185,129,0.15)",
    warning: "#eab308",
    warningBg: "rgba(234,179,8,0.15)",
    teamBlue: "#38bdf8",
    teamBlueBg: "rgba(56,189,248,0.05)",
    teamRed: "#f87171",
    teamRedBg: "rgba(248,113,113,0.05)",
    tierS: "#fbbf24",
    tierSBg: "rgba(251,191,36,0.15)",
    tierA: "#38bdf8",
    tierABg: "rgba(56,189,248,0.15)",
    tierB: "#a78bfa",
    tierBBg: "rgba(167,139,250,0.15)",
    tierC: "#737373",
    tierCBg: "rgba(115,115,115,0.15)",
    scoreHigh: "#34d399",
    scoreHighBg: "#10b981",
    scoreMid: "#fbbf24",
    scoreMidBg: "#f59e0b",
    scoreLow: "#facc15",
    scoreLowBg: "#eab308",
    scorePoor: "#f87171",
    scorePoorBg: "#ef4444",
    chartGrid: "#18181f",
    chartAxis: "#363640",
    chartTick: "#6a6a78",
    chartPrimary: "#d97706",
    chartSecondary: "#6a6a78",
    chartTooltipBg: "#050507",
    chartTooltipBorder: "#18181f",
    selectionBg: "rgba(217,119,6,0.25)",
    selectionText: "#fef3c7",
  },
};

const emberTheme: ThemeDefinition = {
  id: "ember",
  name: "Ember",
  category: "light",
  colors: {
    background: "#faf7f2",
    foreground: "#2a2520",
    surface: "#f0ebe4",
    surfaceHover: "#e8e2d8",
    border: "#d6cfc4",
    borderHover: "#c4baa8",
    textPrimary: "#2a2520",
    textSecondary: "#5c544a",
    textMuted: "#8a8078",
    accent: "#b45309",
    accentHover: "#d97706",
    accentText: "#b45309",
    accentBg: "#b45309",
    accentBgHover: "#d97706",
    danger: "#dc2626",
    dangerBg: "rgba(220,38,38,0.8)",
    success: "#059669",
    successBg: "rgba(5,150,105,0.12)",
    warning: "#ca8a04",
    warningBg: "rgba(202,138,4,0.12)",
    teamBlue: "#0284c7",
    teamBlueBg: "rgba(2,132,199,0.08)",
    teamRed: "#dc2626",
    teamRedBg: "rgba(220,38,38,0.08)",
    tierS: "#d97706",
    tierSBg: "rgba(217,119,6,0.12)",
    tierA: "#0284c7",
    tierABg: "rgba(2,132,199,0.12)",
    tierB: "#7c3aed",
    tierBBg: "rgba(124,58,237,0.12)",
    tierC: "#78716c",
    tierCBg: "rgba(120,113,108,0.12)",
    scoreHigh: "#059669",
    scoreHighBg: "#10b981",
    scoreMid: "#d97706",
    scoreMidBg: "#f59e0b",
    scoreLow: "#ca8a04",
    scoreLowBg: "#eab308",
    scorePoor: "#dc2626",
    scorePoorBg: "#ef4444",
    chartGrid: "#e8e2d8",
    chartAxis: "#c4baa8",
    chartTick: "#8a8078",
    chartPrimary: "#b45309",
    chartSecondary: "#8a8078",
    chartTooltipBg: "#faf7f2",
    chartTooltipBorder: "#d6cfc4",
    selectionBg: "rgba(180,83,9,0.2)",
    selectionText: "#451a03",
  },
};

const abyssTheme: ThemeDefinition = {
  id: "abyss",
  name: "Abyss",
  category: "dark",
  colors: {
    background: "#060a12",
    foreground: "#c8d6e5",
    surface: "#0c1220",
    surfaceHover: "#121a2b",
    border: "#1a2436",
    borderHover: "#243044",
    textPrimary: "#c8d6e5",
    textSecondary: "#8a9bb5",
    textMuted: "#5e7290",
    accent: "#0d9488",
    accentHover: "#14b8a6",
    accentText: "#0d9488",
    accentBg: "#0d9488",
    accentBgHover: "#14b8a6",
    danger: "#f43f5e",
    dangerBg: "rgba(244,63,94,0.8)",
    success: "#10b981",
    successBg: "rgba(16,185,129,0.15)",
    warning: "#eab308",
    warningBg: "rgba(234,179,8,0.15)",
    teamBlue: "#38bdf8",
    teamBlueBg: "rgba(56,189,248,0.06)",
    teamRed: "#fb7185",
    teamRedBg: "rgba(251,113,133,0.06)",
    tierS: "#fbbf24",
    tierSBg: "rgba(251,191,36,0.15)",
    tierA: "#38bdf8",
    tierABg: "rgba(56,189,248,0.15)",
    tierB: "#a78bfa",
    tierBBg: "rgba(167,139,250,0.15)",
    tierC: "#64748b",
    tierCBg: "rgba(100,116,139,0.15)",
    scoreHigh: "#34d399",
    scoreHighBg: "#10b981",
    scoreMid: "#fbbf24",
    scoreMidBg: "#f59e0b",
    scoreLow: "#facc15",
    scoreLowBg: "#eab308",
    scorePoor: "#fb7185",
    scorePoorBg: "#f43f5e",
    chartGrid: "#1a2436",
    chartAxis: "#243044",
    chartTick: "#5e7290",
    chartPrimary: "#0d9488",
    chartSecondary: "#5e7290",
    chartTooltipBg: "#060a12",
    chartTooltipBorder: "#1a2436",
    selectionBg: "rgba(13,148,136,0.25)",
    selectionText: "#ccfbf1",
  },
};

const blossomTheme: ThemeDefinition = {
  id: "blossom",
  name: "Blossom",
  category: "light",
  colors: {
    background: "#fdf2f8",
    foreground: "#3b1a2e",
    surface: "#f5e0ec",
    surfaceHover: "#edd4e2",
    border: "#e0c0d4",
    borderHover: "#d4a8c2",
    textPrimary: "#3b1a2e",
    textSecondary: "#6b3a56",
    textMuted: "#9a6a84",
    accent: "#db2777",
    accentHover: "#ec4899",
    accentText: "#db2777",
    accentBg: "#db2777",
    accentBgHover: "#ec4899",
    danger: "#e11d48",
    dangerBg: "rgba(225,29,72,0.8)",
    success: "#059669",
    successBg: "rgba(5,150,105,0.12)",
    warning: "#ca8a04",
    warningBg: "rgba(202,138,4,0.12)",
    teamBlue: "#0284c7",
    teamBlueBg: "rgba(2,132,199,0.08)",
    teamRed: "#e11d48",
    teamRedBg: "rgba(225,29,72,0.08)",
    tierS: "#d97706",
    tierSBg: "rgba(217,119,6,0.12)",
    tierA: "#0284c7",
    tierABg: "rgba(2,132,199,0.12)",
    tierB: "#7c3aed",
    tierBBg: "rgba(124,58,237,0.12)",
    tierC: "#78716c",
    tierCBg: "rgba(120,113,108,0.12)",
    scoreHigh: "#059669",
    scoreHighBg: "#10b981",
    scoreMid: "#d97706",
    scoreMidBg: "#f59e0b",
    scoreLow: "#ca8a04",
    scoreLowBg: "#eab308",
    scorePoor: "#e11d48",
    scorePoorBg: "#f43f5e",
    chartGrid: "#edd4e2",
    chartAxis: "#d4a8c2",
    chartTick: "#9a6a84",
    chartPrimary: "#db2777",
    chartSecondary: "#9a6a84",
    chartTooltipBg: "#fdf2f8",
    chartTooltipBorder: "#e0c0d4",
    selectionBg: "rgba(219,39,119,0.2)",
    selectionText: "#500724",
  },
};

const steelTheme: ThemeDefinition = {
  id: "steel",
  name: "Steel",
  category: "dark",
  colors: {
    background: "#09090b",
    foreground: "#d4d4d8",
    surface: "#111113",
    surfaceHover: "#18181b",
    border: "#27272a",
    borderHover: "#3f3f46",
    textPrimary: "#d4d4d8",
    textSecondary: "#a1a1aa",
    textMuted: "#71717a",
    accent: "#71717a",
    accentHover: "#a1a1aa",
    accentText: "#a1a1aa",
    accentBg: "#52525b",
    accentBgHover: "#71717a",
    danger: "#ef4444",
    dangerBg: "rgba(239,68,68,0.8)",
    success: "#10b981",
    successBg: "rgba(16,185,129,0.15)",
    warning: "#eab308",
    warningBg: "rgba(234,179,8,0.15)",
    teamBlue: "#38bdf8",
    teamBlueBg: "rgba(56,189,248,0.05)",
    teamRed: "#f87171",
    teamRedBg: "rgba(248,113,113,0.05)",
    tierS: "#fbbf24",
    tierSBg: "rgba(251,191,36,0.15)",
    tierA: "#38bdf8",
    tierABg: "rgba(56,189,248,0.15)",
    tierB: "#a78bfa",
    tierBBg: "rgba(167,139,250,0.15)",
    tierC: "#52525b",
    tierCBg: "rgba(82,82,91,0.15)",
    scoreHigh: "#34d399",
    scoreHighBg: "#10b981",
    scoreMid: "#fbbf24",
    scoreMidBg: "#f59e0b",
    scoreLow: "#facc15",
    scoreLowBg: "#eab308",
    scorePoor: "#f87171",
    scorePoorBg: "#ef4444",
    chartGrid: "#27272a",
    chartAxis: "#3f3f46",
    chartTick: "#71717a",
    chartPrimary: "#a1a1aa",
    chartSecondary: "#52525b",
    chartTooltipBg: "#09090b",
    chartTooltipBorder: "#27272a",
    selectionBg: "rgba(113,113,122,0.25)",
    selectionText: "#e4e4e7",
  },
};

export const themes: ThemeDefinition[] = [
  voidTheme,
  emberTheme,
  abyssTheme,
  blossomTheme,
  steelTheme,
];

export function getThemeById(id: string): ThemeDefinition {
  return themes.find((t) => t.id === id) ?? voidTheme;
}
