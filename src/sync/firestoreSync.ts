import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

import { db as firestoreDb } from '../firebase/config';

import {
  db as localDb,
  getPendingMutations,
  removeSyncMutation,
  saveBlockLocally,
  saveSettingsLocally,
} from '../db/localDb';

import type { PlannerBlock, PlannerSettings } from '../types/planner';
import { DEFAULT_SETTINGS } from '../core/settings';

export type SyncResult = 'synced' | 'offline' | 'error';

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeRemoteBlock(
  id: string,
  data: Record<string, unknown>
): PlannerBlock {
  let tagColor: PlannerBlock['tagColor'] = null;

  if (Array.isArray(data.tagColor)) {
    const channels = data.tagColor as unknown[];

    if (channels.length === 4) {
      const r = Number(channels[0]);
      const g = Number(channels[1]);
      const b = Number(channels[2]);
      const a = Number(channels[3]);

      if ([r, g, b, a].every(Number.isFinite)) {
        tagColor = [r, g, b, a] as [number, number, number, number];
      }
    }
  }

  return {
    id,
    name: asString(data.name, 'Untitled'),
    date: asString(data.date, ''),
    startMinute: asNumber(data.startMinute, 0),
    duration: asNumber(data.duration, 15),
    type: data.type === 'break' ? 'break' : 'task',
    completed: asBoolean(data.completed, false),
    tagColor,
    recurring: data.recurring === 'daily' ? 'daily' : 'none',
    carriedFromId:
      typeof data.carriedFromId === 'string' ? data.carriedFromId : null,
    createdAt: asNumber(data.createdAt, Date.now()),
    updatedAt: asNumber(data.updatedAt, Date.now()),
    deleted: asBoolean(data.deleted, false),
  };
}

function normalizeRemoteSettings(
  data: Record<string, unknown>
): PlannerSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(data as Partial<PlannerSettings>),
  };
}

export async function pushPendingMutations(uid: string): Promise<number> {
  const mutations = await getPendingMutations(uid);

  if (mutations.length === 0) {
    return 0;
  }

  const batch = writeBatch(firestoreDb);

  for (const mutation of mutations) {
    if (mutation.entityType === 'block') {
      const ref = doc(
        firestoreDb,
        'users',
        uid,
        'blocks',
        mutation.entityId
      );

      if (mutation.op === 'delete') {
        const payload = (mutation.payload ?? {}) as Record<string, unknown>;

        batch.set(
          ref,
          {
            ...payload,
            id: mutation.entityId,
            deleted: true,
            updatedAt: mutation.createdAt,
          },
          { merge: true }
        );
      } else if (mutation.payload) {
        batch.set(
          ref,
          mutation.payload as Record<string, unknown>,
          { merge: true }
        );
      }
    }

    if (mutation.entityType === 'settings') {
      const ref = doc(
        firestoreDb,
        'users',
        uid,
        'settings',
        'main'
      );

      if (mutation.payload) {
        batch.set(
          ref,
          {
            ...(mutation.payload as Record<string, unknown>),
            updatedAt: mutation.createdAt,
          },
          { merge: true }
        );
      }
    }
  }

  await batch.commit();

  for (const mutation of mutations) {
    await removeSyncMutation(mutation.id);
  }

  return mutations.length;
}

export async function pullRemoteData(uid: string): Promise<void> {
  const blocksSnapshot = await getDocs(
    collection(firestoreDb, 'users', uid, 'blocks')
  );

  for (const docSnap of blocksSnapshot.docs) {
    const remoteBlock = normalizeRemoteBlock(
      docSnap.id,
      docSnap.data() as Record<string, unknown>
    );

    const localRecord = await localDb.blocks.get(remoteBlock.id);

    if (
      !localRecord ||
      remoteBlock.updatedAt >= localRecord.updatedAt
    ) {
      await saveBlockLocally(uid, remoteBlock);
    }
  }

  const settingsRef = doc(
    firestoreDb,
    'users',
    uid,
    'settings',
    'main'
  );

  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    const rawData = settingsSnap.data() as Record<string, unknown>;
    const remoteSettings = normalizeRemoteSettings(rawData);

    const remoteUpdatedAt =
      typeof rawData.updatedAt === 'number' ? rawData.updatedAt : 0;

    const localRecord = await localDb.settings.get(uid);

    if (!localRecord || remoteUpdatedAt >= localRecord.updatedAt) {
      await saveSettingsLocally(uid, remoteSettings);
    }
  }
}

export async function syncAll(uid: string): Promise<SyncResult> {
  if (!navigator.onLine) {
    return 'offline';
  }

  try {
    await pushPendingMutations(uid);
    await pullRemoteData(uid);
    return 'synced';
  } catch (error) {
    console.error('Sync failed:', error);
    return 'error';
  }
}