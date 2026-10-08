import { useState } from 'react';
import { loginWithGoogle } from '../firebase/auth';

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#111',
        color: '#eee',
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Daily Planner</h1>
      <p style={{ color: '#888', marginBottom: 32, textAlign: 'center' }}>
        Sign in to plan your day. Your data syncs across devices.
      </p>

      <button
        onClick={() => void handleLogin()}
        disabled={loading}
        style={{
          padding: '12px 24px',
          backgroundColor: '#7AA9D9',
          color: '#000',
          border: 'none',
          borderRadius: 8,
          fontWeight: 'bold',
          fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>

      {error && (
        <p style={{ color: '#D78C8C', marginTop: 16, fontSize: 14 }}>
          {error}
        </p>
      )}
    </div>
  );
}