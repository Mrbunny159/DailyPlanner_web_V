import { useState } from 'react';
import { useAppStore } from '../state/appStore';
import { DURATION_OPTIONS } from '../core/constants';
import { getCurrentAlignedMinute, DAY_MINUTES } from '../core/time';
import { ResponsiveDialog } from './ResponsiveDialog';

interface AddBlockDialogProps {
  onClose: () => void;
}

export function AddBlockDialog({ onClose }: AddBlockDialogProps) {
  const addBlock = useAppStore((s) => s.addBlock);

  const [names, setNames] = useState('');
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState<'task' | 'break'>('task');
  const [recurring, setRecurring] = useState<'none' | 'daily'>('none');
  const [startMinute, setStartMinute] = useState(getCurrentAlignedMinute());

  const handleSubmit = async () => {
    const lines = names
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    if (type === 'break') {
      await addBlock({
        name: lines[0],
        duration,
        type: 'break',
        recurring,
        startMinute,
      });
    } else {
      for (const name of lines) {
        await addBlock({
          name,
          duration,
          type: 'task',
          recurring,
          startMinute,
        });
      }
    }

    onClose();
  };

  const adjustTime = (delta: number) => {
    setStartMinute((prev) => {
      let next = prev + delta;
      if (next < 0) next = 0;
      if (next > DAY_MINUTES - duration) next = DAY_MINUTES - duration;
      return Math.round(next / 15) * 15;
    });
  };

  const formatTime = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    const h12 = h % 12 || 12;
    const suffix = h < 12 ? 'am' : 'pm';
    return `${h12}:${String(min).padStart(2, '0')}${suffix}`;
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
    <ResponsiveDialog title="Add Block" onClose={onClose}>
      <label>
        Name{' '}
        {type === 'task' && (
          <small style={{ color: '#888' }}>(one per line)</small>
        )}
        <textarea
          value={names}
          onChange={(e) => setNames(e.target.value)}
          rows={type === 'task' ? 4 : 1}
          placeholder={type === 'task' ? 'Study\nExercise' : 'Lunch'}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: type === 'task' ? 88 : 44,
          }}
        />
      </label>

      <label>
        Duration
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          style={inputStyle}
        >
          {DURATION_OPTIONS.map((d) => (
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
        Start Time{' '}
        {type === 'task' && (
          <small style={{ color: '#888' }}>(auto-placed)</small>
        )}
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
            {formatTime(startMinute)}
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
          Add
        </button>
      </div>
    </ResponsiveDialog>
  );
}