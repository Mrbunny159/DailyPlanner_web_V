import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { ColorRGBA, PlannerBlock } from '../types/planner';
import { useAppStore } from '../state/appStore';
import { TAG_COLOR_OPTIONS } from '../core/constants';
import { rgbaToCss } from '../core/color';

interface BlockContextMenuProps {
  block: PlannerBlock;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
}

export function BlockContextMenu({
  block,
  position,
  onClose,
  onEdit,
}: BlockContextMenuProps) {
  const updateBlock = useAppStore((s) => s.updateBlock);
  const toggleComplete = useAppStore((s) => s.toggleComplete);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const deleteCompletedBlocks = useAppStore((s) => s.deleteCompletedBlocks);

  useEffect(() => {
    const handleClose = () => onClose();

    document.addEventListener('click', handleClose);
    document.addEventListener('pointerdown', handleClose);
    document.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);

    return () => {
      document.removeEventListener('click', handleClose);
      document.removeEventListener('pointerdown', handleClose);
      document.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [onClose]);

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

  const handleSetTag = async (value: ColorRGBA | null) => {
    await updateBlock(block.id, { tagColor: value });
    onClose();
  };

  const handleDeleteAllCompleted = async () => {
    await deleteCompletedBlocks();
    onClose();
  };

  const itemStyle: CSSProperties = {
    padding: '6px 10px',
    cursor: 'pointer',
    borderRadius: 6,
    fontSize: 13,
  };

  const menuTop = Math.min(position.y, window.innerHeight - 240);
  const menuLeft = Math.min(position.x, window.innerWidth - 220);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        top: menuTop,
        left: menuLeft,
        zIndex: 200,
        backgroundColor: '#2a2a2a',
        border: '1px solid #555',
        borderRadius: 8,
        padding: 6,
        minWidth: 180,
        boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
      }}
    >
      {block.type === 'task' && !block.completed && (
        <div
          style={itemStyle}
          onClick={() => {
            void toggleComplete(block.id);
            onClose();
          }}
        >
          Mark as Complete
        </div>
      )}

      {block.type === 'task' && block.completed && (
        <div
          style={itemStyle}
          onClick={() => {
            void toggleComplete(block.id);
            onClose();
          }}
        >
          Mark as Incomplete
        </div>
      )}

      <div
        style={itemStyle}
        onClick={() => {
          onEdit();
          onClose();
        }}
      >
        Edit
      </div>

      <div
        style={itemStyle}
        onClick={() => {
          void deleteBlock(block.id);
          onClose();
        }}
      >
        Delete
      </div>

      {block.type === 'task' && block.completed && (
        <div
          style={itemStyle}
          onClick={() => {
            void handleDeleteAllCompleted();
          }}
        >
          Delete all completed
        </div>
      )}

      {block.type === 'task' && !block.completed && (
        <div style={{ padding: '6px 10px' }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
            Set Color Tag
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
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
                  width: 20,
                  height: 20,
                  borderRadius: 4,
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
    </div>
  );
}