import type { PlannerBlock } from '../types/planner';
import { createBlock } from './blocks';
import { findNextFreeSlot } from './scheduler';
import { DAY_MINUTES, getCurrentAlignedMinute } from './time';

export function createCarryoverBlocks(
  existingBlocksIncludingDeleted: PlannerBlock[],
  previousBlocks: PlannerBlock[],
  date: string,
  nowMinute?: number
): PlannerBlock[] {
  const newBlocks: PlannerBlock[] = [];

  let currentBlocks = [...existingBlocksIncludingDeleted];
  let cursor = nowMinute ?? getCurrentAlignedMinute();

  const addCarriedBlock = (
    oldBlock: PlannerBlock,
    recurring: 'none' | 'daily'
  ) => {
    let slot = findNextFreeSlot(oldBlock.duration, currentBlocks, cursor);

    if (!slot) {
      slot = findNextFreeSlot(oldBlock.duration, currentBlocks, 0);
    }

    const start = slot
      ? slot.start
      : Math.max(0, DAY_MINUTES - oldBlock.duration);

    const block = createBlock({
      name: oldBlock.name,
      duration: oldBlock.duration,
      type: 'task',
      recurring,
      date,
      startMinute: start,
      tagColor: oldBlock.tagColor,
      carriedFromId: oldBlock.id,
    });

    newBlocks.push(block);
    currentBlocks = [...currentBlocks, block];

    cursor = start + block.duration + 1;

    if (cursor >= DAY_MINUTES) {
      cursor = 0;
    }
  };

  // 1. Generate recurring daily tasks for today
  for (const oldBlock of previousBlocks) {
    if (
      oldBlock.type !== 'task' ||
      oldBlock.recurring !== 'daily' ||
      oldBlock.deleted
    ) {
      continue;
    }

    const alreadyExistsToday = currentBlocks.some(
      (block) =>
        block.type === 'task' &&
        block.recurring === 'daily' &&
        block.name === oldBlock.name
    );

    if (alreadyExistsToday) {
      continue;
    }

    addCarriedBlock(oldBlock, 'daily');
  }

  // 2. Carry forward unfinished non-recurring tasks
  for (const oldBlock of previousBlocks) {
    if (
      oldBlock.type !== 'task' ||
      oldBlock.completed ||
      oldBlock.recurring === 'daily' ||
      oldBlock.deleted
    ) {
      continue;
    }

    const alreadyCarriedToday = currentBlocks.some(
      (block) => block.carriedFromId === oldBlock.id
    );

    if (alreadyCarriedToday) {
      continue;
    }

    addCarriedBlock(oldBlock, 'none');
  }

  return newBlocks;
}