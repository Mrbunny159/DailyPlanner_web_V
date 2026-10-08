import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { PlannerBlock } from '../types/planner';
import {
  minuteToTimeLabel,
  formatDuration,
  DAY_MINUTES,
  clamp,
  getCurrentMinute,
} from '../core/time';
import { rgbToCss, rgbaToCss } from '../core/color';
import { MIN_TASK_DURATION } from '../core/constants';
import { useAppStore } from '../state/appStore';
import { EditBlockDialog } from './EditBlockDialog';
import { BlockContextMenu } from './BlockContextMenu';
import { BlockActionSheet } from './BlockActionSheet';

interface BlockItemProps {
  block: PlannerBlock;
}

type DragState = {
  mode: 'move' | 'resize';
  pointerY: number;
  origStart: number;
  origDuration: number;
  currentStart: number;
  currentDuration: number;
};

export function BlockItem({ block }: BlockItemProps) {
  const settings = useAppStore((s) => s.settings);
  const selectedBlockId = useAppStore((s) => s.selectedBlockId);
  const setSelectedBlock = useAppStore((s) => s.setSelectedBlock);
  const toggleComplete = useAppStore((s) => s.toggleComplete);
  const moveBlock = useAppStore((s) => s.moveBlock);
  const resizeBlock = useAppStore((s) => s.resizeBlock);

  const isFlashing = useAppStore((s) =>
    s.flashingBlockIds.includes(block.id)
  );

  const rootRef = useRef<HTMLDivElement>(null);

  const longPressTimer = useRef<number | null>(null);
  const pointerStart = useRef<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const lastDragEnd = useRef(0);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const [nowMinute, setNowMinute] = useState(getCurrentMinute);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMinute(getCurrentMinute());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current !== null) {
        window.clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const isSelected = selectedBlockId === block.id;
  const isTask = block.type === 'task';

  const displayStart = dragState?.currentStart ?? block.startMinute;
  const displayDuration = dragState?.currentDuration ?? block.duration;

  const fillColor = block.tagColor
    ? rgbaToCss(block.tagColor)
    : isTask
      ? rgbaToCss(settings.taskColor)
      : rgbaToCss(settings.breakColor);

  const borderColor = isTask
    ? rgbToCss(settings.taskBorderColor)
    : rgbToCss(settings.breakBorderColor);

  const isPastBreak =
    block.type === 'break' &&
    block.startMinute + block.duration < nowMinute;

  const opacity = block.completed || isPastBreak ? 0.4 : 1;

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }

    if (Date.now() - lastDragEnd.current < 300) {
      return;
    }

    setSelectedBlock(block.id);

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches
    ) {
      setShowActionSheet(true);
    }
  }, [block.id, setSelectedBlock]);

  const handleDoubleClick = useCallback(() => {
    setShowEditDialog(true);
  }, []);

  const handleContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      clearLongPress();
      e.preventDefault();

      setSelectedBlock(block.id);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
      });
    },
    [block.id, setSelectedBlock, clearLongPress]
  );

  const handleCheckbox = useCallback(() => {
    void toggleComplete(block.id);
  }, [block.id, toggleComplete]);

  const startDrag = useCallback(
    (e: ReactPointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
      if (!isTask) return;
      if (e.button !== 0) return;
      if (e.target instanceof HTMLInputElement) return;

      e.preventDefault();

      if (rootRef.current) {
        try {
          rootRef.current.setPointerCapture(e.pointerId);
        } catch {
          // Ignore pointer capture errors.
        }
      }

      setDragState({
        mode,
        pointerY: e.clientY,
        origStart: block.startMinute,
        origDuration: block.duration,
        currentStart: block.startMinute,
        currentDuration: block.duration,
      });
    },
    [isTask, block.startMinute, block.duration]
  );

  const handleBlockPointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;
            if (e.target instanceof HTMLInputElement) return;

            const startX = e.clientX;
            const startY = e.clientY;
            const pointerId = e.pointerId;

            pointerStart.current = {
            x: startX,
            y: startY,
            id: pointerId,
            };

            clearLongPress();

            longPressTimer.current = window.setTimeout(() => {
            suppressClick.current = true;

            setSelectedBlock(block.id);
            setContextMenu({
                x: startX,
                y: startY,
            });

            setDragState(null);

            if (rootRef.current?.hasPointerCapture(pointerId)) {
                rootRef.current.releasePointerCapture(pointerId);
            }
            }, 550);

            if (isSelected) {
            startDrag(e, 'move');
            }
        },
        [block.id, clearLongPress, setSelectedBlock, startDrag, isSelected]
        );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerStart.current) {
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;

        if (Math.hypot(dx, dy) > 10) {
          clearLongPress();
        }
      }

      if (!dragState) return;

      const delta = e.clientY - dragState.pointerY;

      if (dragState.mode === 'move') {
        const raw = dragState.origStart + delta;

        const snapped = clamp(
          Math.round(raw / 15) * 15,
          0,
          DAY_MINUTES - dragState.origDuration
        );

        if (snapped !== dragState.currentStart) {
          setDragState({
            ...dragState,
            currentStart: snapped,
          });
        }
      } else {
        const raw = dragState.origDuration + delta;

        const maxDuration = Math.max(
          MIN_TASK_DURATION,
          DAY_MINUTES - dragState.origStart
        );

        const snapped = clamp(
          Math.round(raw / 15) * 15,
          MIN_TASK_DURATION,
          maxDuration
        );

        if (snapped !== dragState.currentDuration) {
          setDragState({
            ...dragState,
            currentDuration: snapped,
          });
        }
      }
    },
    [dragState, clearLongPress]
  );

  const handlePointerUp = useCallback(
    async (e: ReactPointerEvent<HTMLDivElement>) => {
      clearLongPress();
      pointerStart.current = null;

      if (rootRef.current?.hasPointerCapture(e.pointerId)) {
        rootRef.current.releasePointerCapture(e.pointerId);
      }

      if (!dragState) return;

      const { mode, currentStart, currentDuration } = dragState;

      setDragState(null);
      lastDragEnd.current = Date.now();

      if (mode === 'move' && currentStart !== block.startMinute) {
        await moveBlock(block.id, currentStart);
      } else if (mode === 'resize' && currentDuration !== block.duration) {
        await resizeBlock(block.id, currentDuration);
      }
    },
    [
      clearLongPress,
      dragState,
      block.id,
      block.startMinute,
      block.duration,
      moveBlock,
      resizeBlock,
    ]
  );

  const handlePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      clearLongPress();
      pointerStart.current = null;

      if (rootRef.current?.hasPointerCapture(e.pointerId)) {
        rootRef.current.releasePointerCapture(e.pointerId);
      }

      setDragState(null);
    },
    [clearLongPress]
  );

  const startTime = minuteToTimeLabel(displayStart);
  const endTime = minuteToTimeLabel(displayStart + displayDuration);

  return (
    <>
      <div
        ref={rootRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handleBlockPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => void handlePointerUp(e)}
        onPointerCancel={handlePointerCancel}
        style={{
          position: 'absolute',
          top: displayStart,
          left: isTask ? 56 : 72,
          right: isTask ? 8 : 24,
          height: Math.max(displayDuration, 15),
          backgroundColor: fillColor,
          border: `2px solid ${isSelected ? '#FFD54F' : borderColor}`,
          borderRadius: 10,
          opacity,
          cursor: dragState
            ? dragState.mode === 'resize'
              ? 'row-resize'
              : 'grabbing'
            : isTask
              ? 'grab'
              : 'default',
          display: 'flex',
          alignItems: 'center',
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: isTask && isSelected ? 24 : 8,
          paddingRight: 8,
          boxSizing: 'border-box',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
      >
        {/* Conflict flash overlay */}
        {isFlashing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255, 80, 80, 0.35)',
              borderRadius: 8,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Move grip */}
        {isTask && isSelected && (
          <div
            aria-label="Move task"
            role="button"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              clearLongPress();
              startDrag(e, 'move');
            }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 20,
              cursor: dragState?.mode === 'move' ? 'grabbing' : 'grab',
              touchAction: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.85)',
                pointerEvents: 'none',
              }}
            >
              ↕
            </span>
          </div>
        )}

        {/* Task name */}
        <span
          style={{
            color: '#f0f0f0',
            fontSize: 13,
            fontWeight: 'bold',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {block.name}
        </span>

        {/* Time range */}
        <span
          style={{
            color: '#d2d2d2',
            fontSize: settings.timeFontSize,
            fontWeight: settings.timeFontBold ? 'bold' : 'normal',
            marginRight: 8,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {startTime} - {endTime}
        </span>

        {/* Duration pill */}
        <span
          style={{
            backgroundColor: 'rgba(200, 0, 0, 0.8)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: 8,
            border: '1px solid rgba(255, 200, 200, 0.8)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {formatDuration(displayDuration)}
        </span>

        {/* Carried-over indicator */}
        {block.carriedFromId && (
          <span
            title="Carried over"
            style={{
              marginLeft: 4,
              fontSize: 10,
              pointerEvents: 'none',
            }}
          >
            ↷
          </span>
        )}

        {/* Recurring indicator */}
        {block.recurring === 'daily' && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 10,
              pointerEvents: 'none',
            }}
          >
            ♻️
          </span>
        )}

        {/* Checkbox for tasks */}
        {isTask && (
          <input
            type="checkbox"
            checked={block.completed}
            onChange={handleCheckbox}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: 8,
              width: 18,
              height: 18,
              cursor: 'pointer',
            }}
          />
        )}

        {/* Resize handle */}
        {isTask && isSelected && (
            <div
                onPointerDown={(e) => {
                e.stopPropagation();
                startDrag(e, 'resize');
                }}
                style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 14,
                cursor: 'row-resize',
                touchAction: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingBottom: 2,
                }}
            >
                <div
                style={{
                    width: 48,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    pointerEvents: 'none',
                }}
                />
            </div>
            )}
      </div>

      {showEditDialog && (
        <EditBlockDialog
          block={block}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {contextMenu && (
        <BlockContextMenu
          block={block}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={() => setShowEditDialog(true)}
        />
      )}

      {showActionSheet && (
        <BlockActionSheet
          block={block}
          onClose={() => setShowActionSheet(false)}
          onEdit={() => {
            setShowActionSheet(false);
            setShowEditDialog(true);
          }}
        />
      )}
    </>
  );
}