import type { ColorRGB, ColorRGBA } from '../types/planner';

export function rgbToCss(color: ColorRGB): string {
  const [r, g, b] = color;
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbaToCss(color: ColorRGBA): string {
  const [r, g, b, a] = color;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}