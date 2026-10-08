import { useState } from 'react';
import { useAppStore } from '../state/appStore';
import { applyThemeToSettings } from '../core/settings';
import type { ThemeName } from '../types/planner';
import { ResponsiveDialog } from './ResponsiveDialog';

function minuteToHHMM(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hhmmToMinute(value: string): number {
  const [h = 0, m = 0] = value.split(':').map(Number);
  return h * 60 + m;
}

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [theme, setTheme] = useState<ThemeName>(settings.theme);
  const [dayStart, setDayStart] = useState(
    minuteToHHMM(settings.dayStartMinute)
  );
  const [dayEnd, setDayEnd] = useState(
    minuteToHHMM(settings.dayEndMinute)
  );
  const [timeFontSize, setTimeFontSize] = useState(settings.timeFontSize);
  const [timeFontBold, setTimeFontBold] = useState(settings.timeFontBold);

  const handleSave = async () => {
    let next = applyThemeToSettings(settings, theme);

    next = {
      ...next,
      dayStartMinute: hhmmToMinute(dayStart),
      dayEndMinute: hhmmToMinute(dayEnd),
      timeFontSize,
      timeFontBold,
    };

    await updateSettings(next);
    onClose();
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
    <ResponsiveDialog title="Settings" onClose={onClose}>
      <label>
        Color Theme
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeName)}
          style={inputStyle}
        >
          <option value="default">Default</option>
          <option value="gray">Gray</option>
        </select>
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ flex: 1 }}>
          Day starts
          <input
            type="time"
            step={900}
            value={dayStart}
            onChange={(e) => setDayStart(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ flex: 1 }}>
          Day ends
          <input
            type="time"
            step={900}
            value={dayEnd}
            onChange={(e) => setDayEnd(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <label>
        Time font size
        <input
          type="number"
          min={7}
          max={16}
          value={timeFontSize}
          onChange={(e) => setTimeFontSize(Number(e.target.value))}
          style={inputStyle}
        />
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
        }}
      >
        <input
          type="checkbox"
          checked={timeFontBold}
          onChange={(e) => setTimeFontBold(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        Bold time text
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
          onClick={() => void handleSave()}
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