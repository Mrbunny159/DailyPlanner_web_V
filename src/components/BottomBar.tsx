import type { CSSProperties } from 'react';
import { useAppStore } from '../state/appStore';
import { calculateSummary } from '../core/scheduler';
import { formatDuration } from '../core/time';

interface BottomBarProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
}

export function BottomBar({ onAddClick, onSettingsClick }: BottomBarProps) {
  const blocks = useAppStore((s) => s.blocks);
  const settings = useAppStore((s) => s.settings);
  const selectedBlockId = useAppStore((s) => s.selectedBlockId);

  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const clearAllBlocks = useAppStore((s) => s.clearAllBlocks);
  const runAutoPlan = useAppStore((s) => s.runAutoPlan);

  const summary = calculateSummary(blocks, settings);

  const handleDelete = () => {
    if (selectedBlockId) {
      void deleteBlock(selectedBlockId);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all blocks?')) {
      void clearAllBlocks();
    }
  };

  const handleAutoPlan = () => {
    void runAutoPlan();
  };

  const btnStyle = (color: string, disabled = false): CSSProperties => ({
    flex: '1 1 96px',
    minHeight: 44,
    padding: '10px 6px',
    backgroundColor: color,
    color: '#000',
    border: 'none',
    borderRadius: 8,
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
    lineHeight: 1.1,
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'normal',
  });

  return (
    <div style={{ width: '100%', maxWidth: 560, marginTop: 0 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <button onClick={onAddClick} style={btnStyle('#7AA9D9')}>
          Add
        </button>

        <button
          onClick={handleDelete}
          disabled={!selectedBlockId}
          style={btnStyle('#D78C8C', !selectedBlockId)}
        >
          Delete
        </button>

        <button
          onClick={handleClearAll}
          disabled={blocks.length === 0}
          style={btnStyle('#BD92C2', blocks.length === 0)}
        >
          Clear All
        </button>

        <button
          onClick={handleAutoPlan}
          disabled={blocks.length === 0}
          style={btnStyle('#E8B977', blocks.length === 0)}
        >
          Auto Plan
        </button>

        <button onClick={onSettingsClick} style={btnStyle('#A0A6AD')}>
          Set
        </button>
      </div>

      <div
        style={{
          textAlign: 'center',
          color: '#888',
          fontSize: 12,
          fontWeight: 500,
          padding: '4px 0',
        }}
      >
        Done: {formatDuration(summary.completedMinutes)} &nbsp;·&nbsp; Free:{' '}
        {formatDuration(summary.freeMinutes)}
      </div>
    </div>
  );
}