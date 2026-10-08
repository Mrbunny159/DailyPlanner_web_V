import { useEffect, useState } from 'react';
import { getCurrentMinute } from '../core/time';

export function NowLine() {
  const [minute, setMinute] = useState(getCurrentMinute());

  useEffect(() => {
    const timer = setInterval(() => {
      setMinute(getCurrentMinute());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: minute,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        zIndex: 9,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: -9,
          backgroundColor: 'rgba(200, 0, 0, 0.8)',
          color: '#ccc',
          fontSize: 11,
          fontWeight: 'bold',
          padding: '2px 8px',
          borderRadius: 9,
          whiteSpace: 'nowrap',
        }}
      >
        {Math.floor(minute / 60) % 24}:{String(minute % 60).padStart(2, '0')}
      </div>
    </div>
  );
}