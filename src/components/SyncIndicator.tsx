import { useAppStore } from '../state/appStore';

export function SyncIndicator() {
  const syncStatus = useAppStore((s) => s.syncStatus);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);

  let color = '#7AA9D9';
  let label = 'Synced';

  if (syncStatus === 'syncing') {
    color = '#E8B977';
    label = 'Syncing...';
  } else if (syncStatus === 'unsynced') {
    color = '#D78C8C';
    label = pendingSyncCount > 0
      ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} pending`
      : 'Offline';
  } else if (syncStatus === 'auth-required') {
    color = '#BD92C2';
    label = 'Sign in to sync';
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        fontSize: 12,
        color: '#ccc',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
      {label}
    </div>
  );
}