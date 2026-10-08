import type { ColorRGBA, PlannerBlock } from '../types/planner';
import { useAppStore } from '../state/appStore';
import { TAG_COLOR_OPTIONS, MIN_TASK_DURATION } from '../core/constants';
import { rgbaToCss } from '../core/color';
import {
  minuteToTimeLabel,
  formatDuration,
  DAY_MINUTES,
  clamp,
} from '../core/time';
import { BottomSheet } from './BottomSheet';

interface BlockActionSheetProps {
  block: PlannerBlock;
  onClose: () => void;
  onEdit: () => void;
}

export function BlockActionSheet({
  block,
  onClose,
  onEdit,
}: BlockActionSheetProps) {
  const toggleComplete = useAppStore((s) => s.toggleComplete);
  const moveBlock = useAppStore((s) => s.moveBlock);
  const resizeBlock = useAppStore((s) => s.resizeBlock);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const updateBlock = useAppStore((s) => s.updateBlock);

  const isTask = block.type === 'task';

  const baseButton = {
    minHeight: 44,
    borderRadius: 8,
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
    padding: '10px 12px',
  };

  const isSameColor = (value: ColorRGBA | null): boolean => {
    if (value === null) {
      return block.tagColor === null;
    }

    if (!block.tagColor) {
      return false;
    }

    return value.every(
      (channel, index) => channel === block.tagColor?.[index]
    );
  };

  const handleComplete = async () => {
    onClose();
    await toggleComplete(block.id);
  };

  const handleDelete = async () => {
    onClose();
    await deleteBlock(block.id);
  };

  const handleMove = async (delta: number) => {
    if (!isTask) return;

    const nextStart = clamp(
      block.startMinute + delta,
      0,
      DAY_MINUTES - block.duration
    );

    await moveBlock(block.id, nextStart);
  };

  const handleResize = async (delta: number) => {
    if (!isTask) return;

    const maxDuration = Math.max(
      MIN_TASK_DURATION,
      DAY_MINUTES - block.startMinute
    );

    const nextDuration = clamp(
      block.duration + delta,
      MIN_TASK_DURATION,
      maxDuration
    );

    await resizeBlock(block.id, nextDuration);
  };

  const handleSetTag = async (value: ColorRGBA | null) => {
    await updateBlock(block.id, { tagColor: value });
  };

  return (
    <BottomSheet title={block.name} onClose={onClose}>
      <div style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>
        {minuteToTimeLabel(block.startMinute)} -{' '}
        {minuteToTimeLabel(block.startMinute + block.duration)} ·{' '}
        {formatDuration(block.duration)}
        {block.recurring === 'daily' && ' · Daily'}
        {block.carriedFromId && ' · Carried over'}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {isTask && (
          <button
            type="button"
            onClick={() => void handleComplete()}
            style={{
              ...baseButton,
              backgroundColor: '#7AA9D9',
              color: '#000',
            }}
          >
            {block.completed ? 'Mark Incomplete' : 'Mark Complete'}
          </button>
        )}

        <button
          type="button"
          onClick={onEdit}
          style={{
            ...baseButton,
            backgroundColor: '#A0A6AD',
            color: '#000',
          }}
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => void handleDelete()}
          style={{
            ...baseButton,
            backgroundColor: '#D78C8C',
            color: '#000',
          }}
        >
          Delete
        </button>
      </div>

      {isTask && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
            Move / Resize
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => void handleMove(-15)}
              style={{
                ...baseButton,
                backgroundColor: '#444',
                color: '#eee',
              }}
            >
              Move 15m earlier
            </button>

            <button
              type="button"
              onClick={() => void handleMove(15)}
              style={{
                ...baseButton,
                backgroundColor: '#444',
                color: '#eee',
              }}
            >
              Move 15m later
            </button>

            <button
              type="button"
              onClick={() => void handleResize(-15)}
              style={{
                ...baseButton,
                backgroundColor: '#444',
                color: '#eee',
              }}
            >
              Shorter 15m
            </button>

            <button
              type="button"
              onClick={() => void handleResize(15)}
              style={{
                ...baseButton,
                backgroundColor: '#444',
                color: '#eee',
              }}
            >
              Longer 15m
            </button>
          </div>
        </div>
      )}

      {isTask && !block.completed && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
            Set Color Tag
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {TAG_COLOR_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                title={option.label}
                aria-label={option.label}
                onClick={() => {
                  void handleSetTag(option.value);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: option.value
                    ? rgbaToCss(option.value)
                    : 'transparent',
                  border: isSameColor(option.value)
                    ? '2px solid #FFD54F'
                    : '1px solid #666',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}