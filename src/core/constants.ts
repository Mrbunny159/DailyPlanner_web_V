import type { ColorRGBA } from '../types/planner';

export const DURATION_OPTIONS = [
  15,
  30,
  45,
  60,
  90,
  120,
  150,
  180,
] as const;

export interface TagColorOption {
  label: string;
  value: ColorRGBA | null;
}

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  {
    label: 'None',
    value: null,
  },
  {
    label: 'Blue',
    value: [60, 100, 200, 180],
  },
  {
    label: 'Green',
    value: [60, 120, 80, 180],
  },
  {
    label: 'Orange',
    value: [200, 120, 40, 180],
  },
  {
    label: 'Red',
    value: [180, 60, 60, 180],
  },
];

export const MIN_TASK_DURATION = 15;

export const BASE_TIMELINE_WIDTH = 480;
export const BASE_TASK_WIDTH = 360;
export const BASE_BREAK_WIDTH = 308;