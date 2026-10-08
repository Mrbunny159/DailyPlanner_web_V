import { useState, useEffect } from 'react';
import { Timeline } from './components/Timeline';
import { AddBlockDialog } from './components/AddBlockDialog';
import { BottomBar } from './components/BottomBar';
import { SettingsDialog } from './components/SettingsDialog';
import { LoginScreen } from './components/LoginScreen';
import { SyncIndicator } from './components/SyncIndicator';
import { EditBlockDialog } from './components/EditBlockDialog';
import { onAuthChange, logout } from './firebase/auth';
import { useAppStore } from './state/appStore';
import { clamp, DAY_MINUTES } from './core/time';
import { MIN_TASK_DURATION } from './core/constants';

function App() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const blocks = useAppStore((s) => s.blocks);

  const setUser = useAppStore((s) => s.setUser);
  const syncNow = useAppStore((s) => s.syncNow);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const toggleComplete = useAppStore((s) => s.toggleComplete);
  const moveBlock = useAppStore((s) => s.moveBlock);
  const resizeBlock = useAppStore((s) => s.resizeBlock);
  const undoDelete = useAppStore((s) => s.undoDelete);
  const pastSnapshots = useAppStore((s) => s.pastSnapshots);
  const futureSnapshots = useAppStore((s) => s.futureSnapshots);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  const canUndo = pastSnapshots.length > 0;
  const canRedo = futureSnapshots.length > 0;



  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user ? user.uid : null);
      setAuthReady(true);
    });

    return unsubscribe;
  }, [setUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (pendingSyncCount > 0) {
      const timer = setTimeout(() => {
        void syncNow();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, pendingSyncCount, syncNow]);

  useEffect(() => {
    const handleOnline = () => {
      void syncNow();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncNow]);

  const editingBlock = editingBlockId
    ? blocks.find((block) => block.id === editingBlockId) ?? null
    : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (showAddDialog || showSettingsDialog || editingBlockId) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        void undoDelete();
        return;
      }

      const state = useAppStore.getState();
      const selectedId = state.selectedBlockId;

      if (!selectedId) return;

      const selected = state.blocks.find((block) => block.id === selectedId);
      if (!selected) return;

      if (e.key === 'Delete') {
        e.preventDefault();
        void deleteBlock(selectedId);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        setEditingBlockId(selectedId);
        return;
      }

      if (e.key === ' ' && selected.type === 'task') {
        e.preventDefault();
        void toggleComplete(selectedId);
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();

        const delta = e.key === 'ArrowDown' ? 15 : -15;

        if (e.shiftKey) {
          if (selected.type !== 'task') return;

          const maxDuration = Math.max(
            MIN_TASK_DURATION,
            DAY_MINUTES - selected.startMinute
          );

          const nextDuration = clamp(
            selected.duration + delta,
            MIN_TASK_DURATION,
            maxDuration
          );

          void resizeBlock(selectedId, nextDuration);
        } else {
          if (selected.type !== 'task') return;

          const nextStart = clamp(
            selected.startMinute + delta,
            0,
            DAY_MINUTES - selected.duration
          );

          void moveBlock(selectedId, nextStart);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showAddDialog,
    showSettingsDialog,
    editingBlockId,
    deleteBlock,
    toggleComplete,
    moveBlock,
    resizeBlock,
    undoDelete,
  ]);

  const handleLogout = () => {
    if (pendingSyncCount > 0) {
      const ok = window.confirm(
        'You have unsynced changes. Sign out anyway? Your changes remain stored locally and will sync next time you sign in.'
      );

      if (!ok) return;
    }

    void logout();
  };

  if (!authReady) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#111',
          color: '#888',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div
      className="app-shell"
      style={{
        width: '100%',
        maxWidth: 560,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(12px + env(safe-area-inset-left))',
        paddingRight: 'calc(12px + env(safe-area-inset-right))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 560,
          marginBottom: 12,
          gap: 8,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>Daily Planner</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  <button
    type="button"
    onClick={() => void undo()}
    disabled={!canUndo}
    aria-label="Undo"
    title="Undo"
    style={{
      minHeight: 36,
      minWidth: 36,
      borderRadius: 8,
      border: '1px solid #555',
      backgroundColor: canUndo ? '#333' : '#222',
      color: canUndo ? '#ccc' : '#555',
      fontSize: 16,
      cursor: canUndo ? 'pointer' : 'not-allowed',
    }}
  >
    ↩
  </button>

  <button
    type="button"
    onClick={() => void redo()}
    disabled={!canRedo}
    aria-label="Redo"
    title="Redo"
    style={{
      minHeight: 36,
      minWidth: 36,
      borderRadius: 8,
      border: '1px solid #555',
      backgroundColor: canRedo ? '#333' : '#222',
      color: canRedo ? '#ccc' : '#555',
      fontSize: 16,
      cursor: canRedo ? 'pointer' : 'not-allowed',
    }}
  >
    ↪
  </button>

  <SyncIndicator />

  <button
    onClick={handleLogout}
    style={{
      padding: '4px 10px',
      borderRadius: 8,
      border: '1px solid #555',
      backgroundColor: '#333',
      color: '#ccc',
      fontSize: 12,
      cursor: 'pointer',
    }}
  >
    Logout
  </button>
</div>
    </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
        }}
      >
      <Timeline />
      </div>


      <BottomBar
        onAddClick={() => setShowAddDialog(true)}
        onSettingsClick={() => setShowSettingsDialog(true)}
      />

      {showAddDialog && (
        <AddBlockDialog onClose={() => setShowAddDialog(false)} />
      )}

      {showSettingsDialog && (
        <SettingsDialog onClose={() => setShowSettingsDialog(false)} />
      )}

      {editingBlock && (
        <EditBlockDialog
          block={editingBlock}
          onClose={() => setEditingBlockId(null)}
        />
      )}
    </div>
  );
}

export default App;