import { create } from 'zustand';
import type {
  PlannerBlock,
  PlannerSettings,
  SyncStatus,
} from '../types/planner';
import { DEFAULT_SETTINGS } from '../core/settings';
import { todayISO } from '../core/date';
import { createBlock, type NewBlockInput } from '../core/blocks';
import {
  autoPlanTasks,
  findNextFreeSlot,
  resolveConflicts,
} from '../core/scheduler';
import {
  addSyncMutation,
  getAllBlocksForUser,
  getBlocksForDate,
  getBlocksForDateIncludingDeleted,
  getPendingMutations,
  getSettingsLocally,
  saveBlockLocally,
  saveSettingsLocally,
  softDeleteBlockLocally,
} from '../db/localDb';
import { createId } from '../core/id';
import { syncAll } from '../sync/firestoreSync';
import { createCarryoverBlocks } from '../core/carryover';

interface AppState {
  uid: string | null;
  isAuthenticated: boolean;
  currentDate: string;
  blocks: PlannerBlock[];
  settings: PlannerSettings;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  selectedBlockId: string | null;
  lastDeleted: PlannerBlock[];
  flashingBlockIds: string[];
  pastSnapshots: PlannerBlock[][];
  futureSnapshots: PlannerBlock[][];

  setUser: (uid: string | null) => void;
  loadDay: (uid: string, date: string) => Promise<void>;
  setSelectedBlock: (id: string | null) => void;

  addBlock: (input: NewBlockInput) => Promise<PlannerBlock | null>;
  updateBlock: (id: string, changes: Partial<PlannerBlock>) => Promise<void>;
  moveBlock: (id: string, startMinute: number) => Promise<void>;
  resizeBlock: (id: string, duration: number) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  clearAllBlocks: () => Promise<void>;
  deleteCompletedBlocks: () => Promise<void>;
  undoDelete: () => Promise<void>;

  runAutoPlan: () => Promise<void>;
  updateSettings: (changes: Partial<PlannerSettings>) => Promise<void>;
  refreshSyncCount: () => Promise<void>;
  syncNow: () => Promise<void>;
  flashBlocks: (ids: string[]) => void;

  commitHistory: () => void;
  restoreSnapshot: (snapshot: PlannerBlock[]) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  uid: null,
  isAuthenticated: false,
  currentDate: todayISO(),
  blocks: [],
  settings: DEFAULT_SETTINGS,
  syncStatus: 'auth-required',
  pendingSyncCount: 0,
  selectedBlockId: null,
  lastDeleted: [],
  flashingBlockIds: [],
  pastSnapshots: [],
  futureSnapshots: [],

  setUser: (uid) => {
    if (!uid) {
      set({
        uid: null,
        isAuthenticated: false,
        blocks: [],
        selectedBlockId: null,
        pendingSyncCount: 0,
        syncStatus: 'auth-required',
        pastSnapshots: [],
        futureSnapshots: [],
      });
      return;
    }

    set({
      uid,
      isAuthenticated: true,
      blocks: [],
      selectedBlockId: null,
      pastSnapshots: [],
      futureSnapshots: [],
    });

    void (async () => {
      await get().loadDay(uid, get().currentDate);
      await get().syncNow();
    })();
  },

  loadDay: async (uid, date) => {
    const previousDate = get().currentDate;

    const [blocks, settings, pending] = await Promise.all([
      getBlocksForDate(uid, date),
      getSettingsLocally(uid),
      getPendingMutations(uid),
    ]);

    let finalBlocks = blocks;
    let pendingCount = pending.length;

    if (date === todayISO()) {
      const [todayIncludingDeleted, allUserBlocks] = await Promise.all([
        getBlocksForDateIncludingDeleted(uid, date),
        getAllBlocksForUser(uid),
      ]);

      const previousDates = Array.from(
        new Set(
          allUserBlocks
            .filter((block) => block.date < date)
            .map((block) => block.date)
        )
      ).sort();

      const lastPreviousDate =
        previousDates.length > 0
          ? previousDates[previousDates.length - 1]
          : null;

      if (lastPreviousDate) {
        const previousBlocks = allUserBlocks.filter(
          (block) => block.date === lastPreviousDate
        );

        const carried = createCarryoverBlocks(
          todayIncludingDeleted,
          previousBlocks,
          date
        );

        if (carried.length > 0) {
          finalBlocks = [...finalBlocks];

          for (const block of carried) {
            await saveBlockLocally(uid, block);

            await addSyncMutation({
              id: createId(),
              uid,
              entityType: 'block',
              entityId: block.id,
              op: 'create',
              payload: block,
              createdAt: Date.now(),
              attempts: 0,
            });

            finalBlocks.push(block);
          }

          const refreshedPending = await getPendingMutations(uid);
          pendingCount = refreshedPending.length;
        }
      }
    }

    set({
      currentDate: date,
      blocks: finalBlocks,
      settings: settings ?? DEFAULT_SETTINGS,
      selectedBlockId: null,
      pendingSyncCount: pendingCount,
      syncStatus: pendingCount > 0 ? 'unsynced' : 'synced',
    });

    if (previousDate !== date) {
      set({
        pastSnapshots: [],
        futureSnapshots: [],
      });
    }
  },

  setSelectedBlock: (id) => {
    set({ selectedBlockId: id });
  },

  refreshSyncCount: async () => {
    const { uid } = get();
    if (!uid) return;

    const pending = await getPendingMutations(uid);

    set({
      pendingSyncCount: pending.length,
      syncStatus: pending.length > 0 ? 'unsynced' : 'synced',
    });
  },

  syncNow: async () => {
    const { uid } = get();
    if (!uid) return;

    if (!navigator.onLine) {
      await get().refreshSyncCount();
      return;
    }

    set({ syncStatus: 'syncing' });

    const result = await syncAll(uid);

    if (result === 'synced') {
      await get().loadDay(uid, get().currentDate);
    } else {
      await get().refreshSyncCount();
    }
  },

  flashBlocks: (ids) => {
    if (ids.length === 0) return;

    set({ flashingBlockIds: ids });

    setTimeout(() => {
      set((state) => ({
        flashingBlockIds: state.flashingBlockIds.filter(
          (id) => !ids.includes(id)
        ),
      }));
    }, 600);
  },

  commitHistory: () => {
    const { blocks, pastSnapshots } = get();

    const snapshot = blocks.map((block) => ({ ...block }));

    const MAX_HISTORY = 50;
    const nextPast = [...pastSnapshots, snapshot].slice(-MAX_HISTORY);

    set({
      pastSnapshots: nextPast,
      futureSnapshots: [],
    });
  },

  restoreSnapshot: async (snapshot) => {
    const { uid, blocks } = get();
    if (!uid) return;

    const snapshotIds = new Set(snapshot.map((b) => b.id));

    for (const block of blocks) {
      if (!snapshotIds.has(block.id)) {
        await softDeleteBlockLocally(block.id);

        await addSyncMutation({
          id: createId(),
          uid,
          entityType: 'block',
          entityId: block.id,
          op: 'delete',
          payload: {
            ...block,
            deleted: true,
            updatedAt: Date.now(),
          },
          createdAt: Date.now(),
          attempts: 0,
        });
      }
    }

    for (const block of snapshot) {
      const restored: PlannerBlock = {
        ...block,
        deleted: false,
        updatedAt: Date.now(),
      };

      await saveBlockLocally(uid, restored);

      await addSyncMutation({
        id: createId(),
        uid,
        entityType: 'block',
        entityId: restored.id,
        op: 'update',
        payload: restored,
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    set({
      blocks: snapshot.map((block) => ({ ...block })),
      selectedBlockId: null,
    });

    await get().refreshSyncCount();
  },

  undo: async () => {
    const { pastSnapshots, futureSnapshots, blocks } = get();

    if (pastSnapshots.length === 0) return;

    const currentSnapshot = blocks.map((block) => ({ ...block }));
    const previousSnapshot = pastSnapshots[pastSnapshots.length - 1];

    set({
      pastSnapshots: pastSnapshots.slice(0, -1),
      futureSnapshots: [...futureSnapshots, currentSnapshot],
    });

    await get().restoreSnapshot(previousSnapshot);
  },

  redo: async () => {
    const { pastSnapshots, futureSnapshots, blocks } = get();

    if (futureSnapshots.length === 0) return;

    const currentSnapshot = blocks.map((block) => ({ ...block }));
    const nextSnapshot = futureSnapshots[futureSnapshots.length - 1];

    set({
      futureSnapshots: futureSnapshots.slice(0, -1),
      pastSnapshots: [...pastSnapshots, currentSnapshot],
    });

    await get().restoreSnapshot(nextSnapshot);
  },

  addBlock: async (input) => {
    const { uid, blocks } = get();
    if (!uid) return null;

    get().commitHistory();

    let startMinute = input.startMinute;

    if (input.type !== 'break') {
      const slot = findNextFreeSlot(input.duration, blocks, startMinute);
      if (slot) {
        startMinute = slot.start;
      }
    }

    const block = createBlock({
      ...input,
      startMinute,
    });

    await saveBlockLocally(uid, block);

    await addSyncMutation({
      id: createId(),
      uid,
      entityType: 'block',
      entityId: block.id,
      op: 'create',
      payload: block,
      createdAt: Date.now(),
      attempts: 0,
    });

    set((state) => ({
      blocks: [...state.blocks, block],
    }));

    await get().refreshSyncCount();

    return block;
  },

  updateBlock: async (id, changes) => {
    const { uid, blocks } = get();
    if (!uid) return;

    get().commitHistory();

    const existing = blocks.find((block) => block.id === id);
    if (!existing) return;

    const nextBlocks = blocks.map((block) => ({ ...block }));
    const target = nextBlocks.find((block) => block.id === id);
    if (!target) return;

    Object.assign(target, changes, {
      updatedAt: Date.now(),
    });

    const shouldResolve =
      'startMinute' in changes ||
      'duration' in changes ||
      'type' in changes;

    const displaced = shouldResolve
      ? resolveConflicts(target, nextBlocks)
      : [];

    const changedBlocks = [target, ...displaced];

    if (displaced.length > 0) {
      get().flashBlocks(displaced.map((block) => block.id));
    }

    set({
      blocks: nextBlocks,
    });

    for (const block of changedBlocks) {
      await saveBlockLocally(uid, block);

      await addSyncMutation({
        id: createId(),
        uid,
        entityType: 'block',
        entityId: block.id,
        op: 'update',
        payload: block,
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    await get().refreshSyncCount();
  },

  moveBlock: async (id, startMinute) => {
    await get().updateBlock(id, { startMinute });
  },

  resizeBlock: async (id, duration) => {
    await get().updateBlock(id, { duration });
  },

  toggleComplete: async (id) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) return;

    await get().updateBlock(id, {
      completed: !block.completed,
    });
  },

  deleteBlock: async (id) => {
    const { uid, blocks } = get();
    if (!uid) return;

    get().commitHistory();

    const existing = blocks.find((block) => block.id === id);
    if (!existing) return;

    const deletedBlock: PlannerBlock = {
      ...existing,
      deleted: true,
      updatedAt: Date.now(),
    };

    await softDeleteBlockLocally(id);

    await addSyncMutation({
      id: createId(),
      uid,
      entityType: 'block',
      entityId: id,
      op: 'delete',
      payload: deletedBlock,
      createdAt: Date.now(),
      attempts: 0,
    });

    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== id),
      selectedBlockId:
        state.selectedBlockId === id ? null : state.selectedBlockId,
      lastDeleted: [existing],
    }));

    await get().refreshSyncCount();
  },

  clearAllBlocks: async () => {
    const { uid, blocks } = get();
    if (!uid) return;

    get().commitHistory();

    for (const block of blocks) {
      await softDeleteBlockLocally(block.id);

      await addSyncMutation({
        id: createId(),
        uid,
        entityType: 'block',
        entityId: block.id,
        op: 'delete',
        payload: {
          ...block,
          deleted: true,
          updatedAt: Date.now(),
        },
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    set({
      blocks: [],
      selectedBlockId: null,
      lastDeleted: blocks,
    });

    await get().refreshSyncCount();
  },

  deleteCompletedBlocks: async () => {
    const { uid, blocks } = get();
    if (!uid) return;

    const completed = blocks.filter(
      (block) => block.type === 'task' && block.completed
    );

    if (completed.length === 0) return;

    get().commitHistory();

    for (const block of completed) {
      await softDeleteBlockLocally(block.id);

      await addSyncMutation({
        id: createId(),
        uid,
        entityType: 'block',
        entityId: block.id,
        op: 'delete',
        payload: {
          ...block,
          deleted: true,
          updatedAt: Date.now(),
        },
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    const completedIds = new Set(completed.map((block) => block.id));

    set((state) => ({
      blocks: state.blocks.filter((block) => !completedIds.has(block.id)),
      selectedBlockId:
        state.selectedBlockId && completedIds.has(state.selectedBlockId)
          ? null
          : state.selectedBlockId,
      lastDeleted: completed,
    }));

    await get().refreshSyncCount();
  },

  undoDelete: async () => {
    const { uid, lastDeleted, currentDate } = get();
    if (!uid || lastDeleted.length === 0) return;

    const restoredVisible: PlannerBlock[] = [];

    for (const block of lastDeleted) {
      const restored: PlannerBlock = {
        ...block,
        deleted: false,
        updatedAt: Date.now(),
      };

      await saveBlockLocally(uid, restored);

      await addSyncMutation({
        id: createId(),
        uid,
        entityType: 'block',
        entityId: restored.id,
        op: 'update',
        payload: restored,
        createdAt: Date.now(),
        attempts: 0,
      });

      if (restored.date === currentDate) {
        restoredVisible.push(restored);
      }
    }

    set((state) => {
      const restoredById = new Map<string, PlannerBlock>(
        restoredVisible.map((block) => [block.id, block])
      );

      const updatedBlocks = state.blocks.map((block) =>
        restoredById.get(block.id) ?? block
      );

      const existingIds = new Set(updatedBlocks.map((block) => block.id));

      const addedBlocks = restoredVisible.filter(
        (block) => !existingIds.has(block.id)
      );

      return {
        blocks: [...updatedBlocks, ...addedBlocks],
        lastDeleted: [],
      };
    });

    await get().refreshSyncCount();
  },

  runAutoPlan: async () => {
    const { uid, blocks } = get();
    if (!uid) return;

    get().commitHistory();

    const nextBlocks = blocks.map((block) => ({ ...block }));
    const plannedBlocks = autoPlanTasks(nextBlocks);
    const visibleBlocks = plannedBlocks.filter((block) => !block.deleted);

    set({
      blocks: visibleBlocks,
    });

    for (const block of plannedBlocks) {
      await saveBlockLocally(uid, block);

      await addSyncMutation({
        id: createId(),
        uid,
        entityType: 'block',
        entityId: block.id,
        op: 'update',
        payload: block,
        createdAt: Date.now(),
        attempts: 0,
      });
    }

    await get().refreshSyncCount();
  },

  updateSettings: async (changes) => {
    const { uid, settings } = get();
    if (!uid) return;

    const nextSettings: PlannerSettings = {
      ...settings,
      ...changes,
    };

    set({
      settings: nextSettings,
    });

    await saveSettingsLocally(uid, nextSettings);

    await addSyncMutation({
      id: createId(),
      uid,
      entityType: 'settings',
      entityId: 'main',
      op: 'update',
      payload: nextSettings,
      createdAt: Date.now(),
      attempts: 0,
    });

    await get().refreshSyncCount();
  },
}));