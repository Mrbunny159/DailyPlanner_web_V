import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';

interface ResponsiveDialogProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export function ResponsiveDialog({
  title,
  onClose,
  children,
}: ResponsiveDialogProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  if (isMobile) {
    return (
      <BottomSheet title={title} onClose={onClose}>
        {children}
      </BottomSheet>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#222',
          color: '#eee',
          padding: 20,
          borderRadius: 12,
          width: 'min(360px, 92vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                color: '#ccc',
                fontSize: 18,
                cursor: 'pointer',
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}