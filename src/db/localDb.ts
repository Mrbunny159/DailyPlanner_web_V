import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  PlannerBlock,
  PlannerSettings,
  SyncMutation,
} from '../types/planner';

export interface LocalBlockRecord extends PlannerBlock {
  uid: string;
}

export interface LocalSettingsRecord {
  uid: string;
  settings: PlannerSettings;
  updatedAt: number;
}

class DailyPlannerDB extends Dexie {
  blocks!: Table<LocalBlockRecord, string>;
  settings!: Table<LocalSettingsRecord, string>;
  syncQueue!: Table<SyncMutation, string>;

  constructor() {
    super('daily-planner-db');

    this.version(1).stores({
      blocks: 'id, uid, date, [uid+date], updatedAt',
      settings: 'uid',
      syncQueue: 'id, uid, createdAt',
    });
  }
}

export const db = new DailyPlannerDB();

function toPlannerBlock(record: LocalBlockRecord): PlannerBlock {
  return {
    id: record.id,
    name: record.name,
    date: record.date,
    startMinute: record.startMinute,
    duration: record.duration,
    type: record.type,
    completed: record.completed,
    tagColor: record.tagColor,
    recurring: record.recurring,
    carriedFromId: record.carriedFromId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deleted: record.deleted,
  };
}

// ─── Blocks ───

export async function saveBlockLocally(
  uid: string,
  block: PlannerBlock
): Promise<void> {
  await db.blocks.put({
    ...block,
    uid,
  });
}

export async function getBlocksForDate(
  uid: string,
  date: string
): Promise<PlannerBlock[]> {
  const records = await db.blocks
    .where('[uid+date]')
    .equals([uid, date])
    .toArray();

  return records.filter((record) => !record.deleted).map(toPlannerBlock);
}

export async function getBlocksForDateIncludingDeleted(
  uid: string,
  date: string
): Promise<PlannerBlock[]> {
  const records = await db.blocks
    .where('[uid+date]')
    .equals([uid, date])
    .toArray();

  return records.map(toPlannerBlock);
}

export async function getAllBlocksForUser(
  uid: string
): Promise<PlannerBlock[]> {
  const records = await db.blocks.where('uid').equals(uid).toArray();

  return records.filter((record) => !record.deleted).map(toPlannerBlock);
}

export async function softDeleteBlockLocally(
  blockId: string
): Promise<void> {
  await db.blocks.update(blockId, {
    deleted: true,
    updatedAt: Date.now(),
  });
}

// ─── Settings ───

export async function saveSettingsLocally(
  uid: string,
  settings: PlannerSettings
): Promise<void> {
  await db.settings.put({
    uid,
    settings,
    updatedAt: Date.now(),
  });
}

export async function getSettingsLocally(
  uid: string
): Promise<PlannerSettings | null> {
  const record = await db.settings.get(uid);
  return record?.settings ?? null;
}

// ─── Sync Queue ───

export async function addSyncMutation(
  mutation: SyncMutation
): Promise<void> {
  await db.syncQueue.put(mutation);
}

export async function getPendingMutations(
  uid: string
): Promise<SyncMutation[]> {
  return db.syncQueue.where('uid').equals(uid).sortBy('createdAt');
}

export async function removeSyncMutation(id: string): Promise<void> {
  await db.syncQueue.delete(id);
}