import type {
  ColorRGB,
  ColorRGBA,
  PlannerSettings,
  ThemeName,
} from '../types/planner';

interface ThemeColors {
  taskColor: ColorRGBA;
  taskBorderColor: ColorRGB;
  breakColor: ColorRGBA;
  breakBorderColor: ColorRGB;
  backgroundColor: ColorRGB;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  default: {
    taskColor: [60, 100, 200, 180],
    taskBorderColor: [100, 150, 220],
    breakColor: [60, 120, 80, 180],
    breakBorderColor: [100, 200, 120],
    backgroundColor: [50, 50, 50],
  },

  gray: {
    taskColor: [80, 80, 80, 200],
    taskBorderColor: [120, 120, 120],
    breakColor: [60, 60, 60, 200],
    breakBorderColor: [100, 100, 100],
    backgroundColor: [20, 20, 20],
  },
};

export const DEFAULT_SETTINGS: PlannerSettings = {
  theme: 'default',
  ...THEMES.default,
  dayStartMinute: 540,
  dayEndMinute: 1080,
  timeFontSize: 10,
  timeFontBold: true,
};

export function normalizeThemeName(
  value: string | null | undefined
): ThemeName {
  const cleaned = (value ?? '').trim().toLowerCase();

  if (cleaned === 'gray' || cleaned === 'grey') {
    return 'gray';
  }

  return 'default';
}

export function applyThemeToSettings(
  settings: PlannerSettings,
  theme: ThemeName
): PlannerSettings {
  return {
    ...settings,
    theme,
    ...THEMES[theme],
  };
}