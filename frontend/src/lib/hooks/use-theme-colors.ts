import { useThemeStore } from "@/lib/stores/theme-store";

export function useThemeColors() {
  const theme = useThemeStore((s) => s.theme);
  return {
    grid: theme.colors.chartGrid,
    axis: theme.colors.chartAxis,
    tick: theme.colors.chartTick,
    primary: theme.colors.chartPrimary,
    secondary: theme.colors.chartSecondary,
    tooltipBg: theme.colors.chartTooltipBg,
    tooltipBorder: theme.colors.chartTooltipBorder,
    foreground: theme.colors.foreground,
    background: theme.colors.background,
    accent: theme.colors.accent,
    accentHover: theme.colors.accentHover,
  };
}
