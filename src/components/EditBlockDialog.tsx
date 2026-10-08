import { useState } from 'react';
import type { PlannerBlock } from '../types/planner';
import { useAppStore } from '../state/appStore';
import { DURATION_OPTIONS } from '../core/constants';
import { DAY_MINUTES, minuteToTimeLabel } from '../core/time';
import { ResponsiveDialog } from './ResponsiveDialog';

interface EditBlockDialogProps {
  block: PlannerBlock;
  onClose: () => void;
}

export function EditBlockDialog({ block, onClose }: EditBlockDialogProps) {
  const updateBlock = useAppStore((s) => s.updateBlock);

  const [name, setName] = useState(block.name);
  const [duration, setDuration] = useState(block.duration);
  const [type, setType] = useState<'task' | 'break'>(block.type);
  const [recurring, setRecurring] = useState<'none' | 'daily'>(
    block.recurring
  );
  const [startMinute, setStartMinute] = useState(block.startMinute);

  const durationOptions = Array.from(
    new Set<number>([...DURATION_OPTIONS, block.duration])
  ).sort((a, b) => a - b);

  const handleSubmit = async () => {
    const changes: Partial<PlannerBlock> = {
      name: name.trim() || 'Untitled',
      duration,
      type,
      recurring,
    };

    if (type === 'break') {
      changes.startMinute = startMinute;
    }

    await updateBlock(block.id, changes);
    onClose();
  };

  const adjustTime = (delta: number) => {
    setStartMinute((prev) => {
      let next = prev + delta;

      if (next < 0) next = 0;
      if (next > DAY_MINUTES - duration) {
        next = Math.max(0, DAY_MINUTES - duration);
      }

      return Math.round(next / 15) * 15;
    });
  };

  const inputStyle = {
    width: '100%',
    marginTop: 4,
    padding: 10,
    backgroundColor: '#333',
    color: '#eee',
    border: '1px solid #555',
    borderRadius: 6,
    boxSizing: 'border-box' as const,
    minHeight: 44,
    fontSize: 15,
  };

  return (
    <ResponsiveDialog title="Edit Block" onClose={onClose}>
      <label>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label>
        Duration
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          style={inputStyle}
        >
          {durationOptions.map((d) => (
            <option key={d} value={d}>
              {d} minutes
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
          }}
        >
          <input
            type="radio"
            checked={type === 'task'}
            onChange={() => setType('task')}
            style={{ width: 18, height: 18 }}
          />
          Task
        </label>

        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
          }}
        >
          <input
            type="radio"
            checked={type === 'break'}
            onChange={() => setType('break')}
            style={{ width: 18, height: 18 }}
          />
          Break
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
          }}
        >
          <input
            type="radio"
            checked={recurring === 'none'}
            onChange={() => setRecurring('none')}
            style={{ width: 18, height: 18 }}
          />
          None
        </label>

        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
          }}
        >
          <input
            type="radio"
            checked={recurring === 'daily'}
            onChange={() => setRecurring('daily')}
            style={{ width: 18, height: 18 }}
          />
          Daily
        </label>
      </div>

      <label>
        Start Time
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 4,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => adjustTime(-15)}
            disabled={type === 'task'}
            style={{
              padding: '10px 16px',
              minHeight: 44,
              opacity: type === 'task' ? 0.5 : 1,
              backgroundColor: '#333',
              color: '#eee',
              border: '1px solid #555',
              borderRadius: 6,
              cursor: type === 'task' ? 'not-allowed' : 'pointer',
            }}
          >
            −
          </button>

          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 16,
              fontWeight: 'bold',
              opacity: type === 'task' ? 0.5 : 1,
            }}
          >
            {minuteToTimeLabel(startMinute)}
          </span>

          <button
            type="button"
            onClick={() => adjustTime(15)}
            disabled={type === 'task'}
            style={{
              padding: '10px 16px',
              minHeight: 44,
              opacity: type === 'task' ? 0.5 : 1,
              backgroundColor: '#333',
              color: '#eee',
              border: '1px solid #555',
              borderRadius: 6,
              cursor: type === 'task' ? 'not-allowed' : 'pointer',
            }}
          >
            +
          </button>
        </div>
      </label>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            minHeight: 44,
            backgroundColor: '#444',
            color: '#eee',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          style={{
            flex: 1,
            padding: 12,
            minHeight: 44,
            backgroundColor: '#7AA9D9',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>
    </ResponsiveDialog>
  );
}