'use client';

import { useState } from 'react';

interface GhostConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function GhostConnectModal({ open, onClose }: GhostConnectModalProps) {
  const [siteUrl, setSiteUrl] = useState('');
  const [adminApiKey, setAdminApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/oauth/ghost/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl, adminApiKey }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Connection failed' }));
        setError(body.error ?? 'Connection failed');
        return;
      }

      window.location.href = '/accounts?connected=ghost';
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
          Connect Ghost
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          Find your Admin API key in Ghost Admin &rarr; Integrations &rarr; Add custom integration.{' '}
          <a
            href="https://ghost.org/docs/admin-api/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--foreground)', textDecoration: 'underline' }}
          >
            Learn more
          </a>
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Site URL
            </span>
            <input
              type="url"
              required
              disabled={loading}
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://yourblog.ghost.io"
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
              Admin API Key
            </span>
            <input
              type="password"
              required
              disabled={loading}
              value={adminApiKey}
              onChange={(e) => setAdminApiKey(e.target.value)}
              placeholder="1234abcd:abc123..."
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
