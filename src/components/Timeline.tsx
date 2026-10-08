import { useRef, useEffect } from 'react';
import { useAppStore } from '../state/appStore';
import { BlockItem } from './BlockItem';
import { NowLine } from './NowLine';
import { DAY_MINUTES } from '../core/time';
import { rgbToCss } from '../core/color';

export function Timeline() {
  const blocks = useAppStore((s) => s.blocks);
  const settings = useAppStore((s) => s.settings);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();

    el.scrollTop = Math.max(0, minute - el.clientHeight / 2);
  }, []);

  const scrollToNow = () => {
    const el = scrollRef.current;
    if (!el) return;

    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();

    el.scrollTo({
      top: Math.max(0, minute - el.clientHeight / 2),
      behavior: 'smooth',
    });
  };

  const hourLines = [];

  for (let hour = 0; hour <= 24; hour++) {
    const y = hour * 60;
    const label = `${(hour % 12 || 12).toString().padStart(2, '0')}:00${
      hour < 12 || hour === 24 ? 'am' : 'pm'
    }`;

    hourLines.push(
      <div key={`hour-${hour}`}>
        {/* Hour label */}
        <div
          style={{
            position: 'absolute',
            top: y - 8,
            left: 2,
            fontSize: 11,
            color: '#888',
            width: 50,
            textAlign: 'right',
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>

        {/* Hour line */}
        <div
          style={{
            position: 'absolute',
            top: y,
            left: 56,
            right: 0,
            height: 2,
            backgroundColor: 'rgba(200, 200, 200, 0.2)',
            pointerEvents: 'none',
          }}
        />

        {/* Half-hour line */}
        {hour < 24 && (
          <div
            style={{
              position: 'absolute',
              top: y + 30,
              left: 56,
              right: 0,
              height: 1,
              backgroundColor: 'rgba(200, 200, 200, 0.1)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div
        ref={scrollRef}
        style={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          borderRadius: 10,
          border: '1px solid #333',
          position: 'relative',
          backgroundColor: rgbToCss(settings.backgroundColor),
        }}
      >
        <div
          style={{
            position: 'relative',
            height: DAY_MINUTES + 30,
            width: '100%',
          }}
        >
          {hourLines}
          <NowLine />

          {blocks.map((block) => (
            <BlockItem key={block.id} block={block} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToNow}
        aria-label="Scroll to current time"
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          minHeight: 40,
          minWidth: 60,
          borderRadius: 20,
          border: 'none',
          backgroundColor: '#7AA9D9',
          color: '#000',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        Now
      </button>
    </div>
  );
}