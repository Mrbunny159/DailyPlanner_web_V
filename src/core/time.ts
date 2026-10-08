export const DAY_MINUTES = 1440;
export const SNAP_MINUTES = 15;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapToStep(value: number, step = SNAP_MINUTES): number {
  return Math.round(value / step) * step;
}

export function alignUpToStep(value: number, step = SNAP_MINUTES): number {
  return Math.ceil(value / step) * step;
}

export function wrapMinute(minute: number): number {
  return ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

export function getCurrentMinute(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function getCurrentAlignedMinute(): number {
  return alignUpToStep(getCurrentMinute(), SNAP_MINUTES);
}

export function minuteToTimeLabel(minute: number): string {
  const wrapped = wrapMinute(minute);
  const hour24 = Math.floor(wrapped / 60);
  const minutePart = wrapped % 60;
  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 < 12 ? 'am' : 'pm';

  return `${hour12}:${String(minutePart).padStart(2, '0')}${suffix}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}