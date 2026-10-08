export type BlockType = 'task' | 'break';
export type Recurring = 'none' | 'daily';
export type ThemeName = 'default' | 'gray';

export type SyncStatus =
  | 'synced'
  | 'syncing'
  | 'unsynced'
  | 'auth-required';

export type ColorRGB = [number, number, number];
export type ColorRGBA = [number, number, number, number];

export interface PlannerBlock {
  id: string;
  name: string;

  // Date this block belongs to, format: YYYY-MM-DD
  date: string;

  // Minutes from 00:00
  startMinute: number;

  // Duration in minutes
  duration: number;

  type: BlockType;
  completed: boolean;

  // RGBA color, or null if no tag color
  tagColor: ColorRGBA | null;

  recurring: Recurring;

  // If this block was carried over from a previous day
  carriedFromId: string | null;

  createdAt: number;
  updatedAt: number;

  // Soft delete for sync safety
  deleted: boolean;
}

export interface PlannerSettings {
  theme: ThemeName;

  taskColor: ColorRGBA;
  taskBorderColor: ColorRGB;

  breakColor: ColorRGBA;
  breakBorderColor: ColorRGB;

  backgroundColor: ColorRGB;

  // Used for summary bar
  dayStartMinute: number;
  dayEndMinute: number;

  // Time label styling
  timeFontSize: number;
  timeFontBold: boolean;
}

export type SyncEntityType = 'block' | 'settings';
export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncMutation {
  id: string;
  uid: string;
  entityType: SyncEntityType;
  entityId: string;
  op: SyncOperation;

  // For create/update: data to push
  // For delete: can be null/undefined
  payload?: unknown;

  createdAt: number;
  attempts: number;
}