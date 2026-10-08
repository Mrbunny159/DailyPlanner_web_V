import type { PlannerBlock, PlannerSettings } from '../types/planner';
import { DAY_MINUTES, SNAP_MINUTES, alignUpToStep, clamp, getCurrentAlignedMinute } from './time';

// ─── Conflict Detection ───

export function blocksOverlap(a: PlannerBlock, b: PlannerBlock): boolean {
  const aEnd = a.startMinute + a.duration;
  const bEnd = b.startMinute + b.duration;
  return a.startMinute < bEnd && aEnd > b.startMinute;
}

export function overlapsAny(
  startMinute: number,
  duration: number,
  blocks: PlannerBlock[],
  excludeId?: string
): boolean {
  const end = startMinute + duration;
  return blocks.some((b) => {
    if (b.id === excludeId || b.deleted) return false;
    const bEnd = b.startMinute + b.duration;
    return startMinute < bEnd && end > b.startMinute;
  });
}

export function overlapsBreak(
  startMinute: number,
  duration: number,
  blocks: PlannerBlock[],
  excludeId?: string
): boolean {
  const end = startMinute + duration;
  return blocks.some((b) => {
    if (b.type !== 'break' || b.id === excludeId || b.deleted) return false;
    const bEnd = b.startMinute + b.duration;
    return startMinute < bEnd && end > b.startMinute;
  });
}

// ─── Find Next Free Slot ───

export function findNextFreeSlot(
  duration: number,
  blocks: PlannerBlock[],
  startFrom?: number,
  excludeId?: string
): { start: number; end: number } | null {
  let current = startFrom ?? getCurrentAlignedMinute();

  // Clamp inside timeline
  current = clamp(current, 0, DAY_MINUTES - duration);

  // Align to 15-minute grid
  if (current % SNAP_MINUTES !== 0) {
    current = alignUpToStep(current, SNAP_MINUTES);
  }

  const activeBlocks = blocks.filter((b) => !b.deleted && b.id !== excludeId);

  // Build sorted occupied intervals
  const occupied = activeBlocks
    .map((b) => ({ start: b.startMinute, end: b.startMinute + b.duration }))
    .sort((a, b) => a.start - b.start);

  while (current + duration <= DAY_MINUTES) {
    const end = current + duration;
    const conflict = occupied.some(
      (occ) => !(end <= occ.start || current >= occ.end)
    );

    if (!conflict) {
      return { start: current, end };
    }

    current += SNAP_MINUTES;
  }

  return null;
}

// ─── Ensure Inside Timeline ───

export function ensureInsideTimeline(startMinute: number, duration: number): number {
  const end = startMinute + duration;

  if (end > DAY_MINUTES) {
    return (startMinute + duration) % DAY_MINUTES;
  }
  if (startMinute < 0) {
    return (startMinute + DAY_MINUTES) % DAY_MINUTES;
  }

  return startMinute;
}

// ─── Push Tasks Below ───

export function pushTasksBelow(
  movedBlock: PlannerBlock,
  allBlocks: PlannerBlock[]
): PlannerBlock[] {
  const movedEnd = movedBlock.startMinute + movedBlock.duration;

  // Get other tasks sorted by start time
  const others = allBlocks
    .filter((b) => b.id !== movedBlock.id && b.type === 'task' && !b.deleted)
    .sort((a, b) => a.startMinute - b.startMinute);

  let cursor = movedEnd;
  const displaced: PlannerBlock[] = [];

  for (const task of others) {
    if (task.startMinute < cursor && task.startMinute + task.duration > movedBlock.startMinute) {
      task.startMinute = cursor;
      task.updatedAt = Date.now();
      cursor = task.startMinute + task.duration;
      displaced.push(task);
    }
  }

  return displaced;
}

// ─── Resolve Conflicts ───

export function resolveConflicts(
  movedBlock: PlannerBlock,
  allBlocks: PlannerBlock[]
): PlannerBlock[] {
  let movedEnd = movedBlock.startMinute + movedBlock.duration;

  // Get blocks starting at or after movedBlock, sorted
  const forwardBlocks = allBlocks
    .filter(
      (b) =>
        b.id !== movedBlock.id &&
        !b.deleted &&
        b.startMinute >= movedBlock.startMinute
    )
    .sort((a, b) => a.startMinute - b.startMinute);

  const displaced: PlannerBlock[] = [];

  for (const block of forwardBlocks) {
    if (block.startMinute < movedEnd) {
      if (block.type === 'task') {
        block.startMinute = movedEnd;
        block.updatedAt = Date.now();
        movedEnd = block.startMinute + block.duration;
        displaced.push(block);
      }
    } else {
      break;
    }
  }

  return displaced;
}

// ─── Auto Plan ───

export function autoPlanTasks(
  allBlocks: PlannerBlock[],
  nowMinute?: number
): PlannerBlock[] {
  const now = nowMinute ?? getCurrentAlignedMinute();
  const alignedNow = alignUpToStep(now, SNAP_MINUTES);

  const activeBlocks = allBlocks.filter((b) => !b.deleted);
  const tasks = activeBlocks.filter((b) => b.type === 'task');
  const breaks = activeBlocks.filter((b) => b.type === 'break');

  const completedBelow: PlannerBlock[] = [];
  const completedAbove: PlannerBlock[] = [];
  const uncompleted: PlannerBlock[] = [];

  for (const task of tasks) {
    if (task.completed) {
      if (task.startMinute + task.duration < alignedNow) {
        completedAbove.push(task);
      } else {
        completedBelow.push(task);
      }
    } else {
      uncompleted.push(task);
    }
  }

  // Move completed tasks that are below current time upward
  let pastMinute = alignedNow - 5;
  const sortedCompletedBelow = [...completedBelow].sort(
    (a, b) => b.startMinute - a.startMinute
  );

  for (const task of sortedCompletedBelow) {
    const newStart = pastMinute - task.duration;
    if (newStart < 0) {
      task.deleted = true;
      task.updatedAt = Date.now();
      continue;
    }
    task.startMinute = ensureInsideTimeline(newStart, task.duration);
    task.updatedAt = Date.now();
    pastMinute = task.startMinute - 1;
  }

  // Re-insert uncompleted tasks from current time onward
  let futureMinute = alignedNow + 5;
  let wrapped = false;

  // Build occupied from completed tasks + breaks
  const getOccupied = (): { start: number; end: number }[] => {
    const placed = [
      ...completedAbove,
      ...sortedCompletedBelow.filter((t) => !t.deleted),
      ...breaks,
    ];
    return placed
      .map((b) => ({ start: b.startMinute, end: b.startMinute + b.duration }))
      .sort((a, b) => a.start - b.start);
  };

  for (const task of uncompleted) {
    const duration = task.duration;
    let retry = 0;

    const hasConflict = (minute: number): boolean => {
      const end = minute + duration;
      return getOccupied().some(
        (occ) => !(end <= occ.start || minute >= occ.end)
      );
    };

    const hitsBreak = (minute: number): boolean => {
      const end = minute + duration;
      return breaks.some((b) => {
        const bEnd = b.startMinute + b.duration;
        return minute < bEnd && end > b.startMinute;
      });
    };

    while (hasConflict(futureMinute) || hitsBreak(futureMinute)) {
      futureMinute += 1;
      retry += 1;

      if (futureMinute + duration >= DAY_MINUTES && !wrapped) {
        futureMinute = 0;
        wrapped = true;
        retry = 0;
      }

      if (retry > 2000) break;
    }

    const validStart = ensureInsideTimeline(futureMinute, duration);
    task.startMinute = validStart;
    task.updatedAt = Date.now();
    futureMinute = validStart + duration + 1;
  }

  return allBlocks;
}

// ─── Summary Calculation ───

export interface DaySummary {
  completedMinutes: number;
  freeMinutes: number;
  plannedMinutes: number;
  breakMinutes: number;
}

export function calculateSummary(
  blocks: PlannerBlock[],
  settings: PlannerSettings
): DaySummary {
  const dayStart = settings.dayStartMinute;
  const dayEnd = settings.dayEndMinute;
  const totalDay = Math.max(dayEnd - dayStart, 1);

  const active = blocks.filter((b) => !b.deleted);
  const tasks = active.filter((b) => b.type === 'task');
  const breaks = active.filter((b) => b.type === 'break');

  const plannedMinutes = tasks.reduce((sum, t) => sum + t.duration, 0);
  const completedMinutes = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.duration, 0);
  const breakMinutes = breaks.reduce((sum, b) => sum + b.duration, 0);
  const freeMinutes = Math.max(totalDay - plannedMinutes - breakMinutes, 0);

  return { completedMinutes, freeMinutes, plannedMinutes, breakMinutes };
}

// ─── Carry Over Uncompleted Tasks ───

export function getUncompletedForCarryOver(
  blocks: PlannerBlock[],
  fromDate: string
): PlannerBlock[] {
  return blocks.filter(
    (b) =>
      b.date === fromDate &&
      b.type === 'task' &&
      !b.completed &&
      !b.deleted
  );
}