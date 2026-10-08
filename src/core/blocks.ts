import type {
  BlockType,
  ColorRGBA,
  PlannerBlock,
  Recurring,
} from '../types/planner';
import { createId } from './id';
import { todayISO } from './date';

export interface NewBlockInput {
  name: string;
  startMinute: number;
  duration: number;
  type?: BlockType;
  recurring?: Recurring;
  date?: string;
  completed?: boolean;
  tagColor?: ColorRGBA | null;
  carriedFromId?: string | null;
}

export function createBlock(input: NewBlockInput): PlannerBlock {
  const now = Date.now();

  const duration = Math.max(
    15,
    Math.round(input.duration / 15) * 15
  );

  return {
    id: createId(),
    name: input.name.trim() || 'Untitled',
    date: input.date ?? todayISO(),
    startMinute: Math.max(0, Math.round(input.startMinute)),
    duration,
    type: input.type ?? 'task',
    completed: input.completed ?? false,
    tagColor: input.tagColor ?? null,
    recurring: input.recurring ?? 'none',
    carriedFromId: input.carriedFromId ?? null,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
}