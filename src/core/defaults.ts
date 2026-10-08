import type {
  ColorRGB,
  ColorRGBA,
  PlannerSettings,
  ThemeName,
} from '../types/planner';

export interface ThemeColors {
  taskColor: ColorRGBA;
  taskBorderColor: ColorRGB;
  breakColor: ColorRGBA;
  breakBorderColor: ColorRGB;
  backgroundColor: ColorRGB;
}

export const COLOR_THEMES: Record<ThemeName, ThemeColors> = {
  default: {
    taskColor: [60, 100, 200, 180],
    taskBorderColor: [100, 150, 220],
    breakColor: [60, 120, 80, 180],
    breakBorderColor: [100, 200, 120],
    backgroundColor: [17, 17, 17],
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
  ...COLOR_THEMES.default,
  dayStartMinute: 540,
  dayEndMinute: 1080,
  timeFontSize: 10,
  timeFontBold: true,
};

export const DURATION_OPTIONS: number[] = [
  15,
  30,
  45,
  60,
  90,
  120,
  150,
  180,
];

export const MIN_BLOCK_DURATION = 15;

export interface TagColorOption {
  label: string;
  value: ColorRGBA | null;
}

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  { label: 'None', value: null },
  { label: 'Blue', value: [60, 100, 200, 180] },
  { label: 'Green', value: [60, 120, 80, 180] },
  { label: 'Orange', value: [200, 120, 40, 180] },
  { label: 'Red', value: [180, 60, 60, 180] },
];