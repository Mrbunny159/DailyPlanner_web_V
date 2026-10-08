import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: '#222',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          border: '1px solid #444',
          borderBottom: 'none',
          padding: 16,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          color: '#eee',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              minHeight: 36,
              minWidth: 36,
              borderRadius: 8,
              border: '1px solid #555',
              backgroundColor: '#333',
              color: '#ccc',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}