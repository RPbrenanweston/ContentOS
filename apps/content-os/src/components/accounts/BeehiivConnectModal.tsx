'use client';

import { useState } from 'react';

interface BeehiivConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function BeehiivConnectModal({ open, onClose }: BeehiivConnectModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [publicationId, setPublicationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/oauth/beehiiv/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, publicationId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Connection failed' }));
        setError(body.error ?? 'Connection failed');
        return;
      }

      window.location.href = '/accounts?connected=beehiiv';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 12,
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'var(--foreground)', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Connect beehiiv
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          Find these in beehiiv Dashboard &rarr; Settings &rarr; Publication.{' '}
          <a
            href="https://app.beehiiv.com/settings/publication"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--foreground)', textDecoration: 'underline' }}
          >
            Open settings
          </a>
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              API Key
            </span>
            <input
              type="password"
              required
              disabled={loading}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your beehiiv API key"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Publication ID
            </span>
            <input
              type="text"
              required
              disabled={loading}
              value={publicationId}
              onChange={(e) => setPublicationId(e.target.value)}
              placeholder="pub_xxxxxxxx"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </label>

          {error && (
            <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--foreground)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#CBFF53',
                color: '#000',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
