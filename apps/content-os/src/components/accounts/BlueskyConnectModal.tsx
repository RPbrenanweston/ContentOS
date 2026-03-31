'use client';

import { useState, type FormEvent } from 'react';

interface BlueskyConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function BlueskyConnectModal({ open, onClose }: BlueskyConnectModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/oauth/bluesky/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), appPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Connection failed' }));
        setError(data.error ?? 'Connection failed');
        return;
      }

      window.location.href = '/accounts?connected=bluesky';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-xl"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Header */}
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--foreground)' }}
        >
          Connect Bluesky
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--muted)' }}
        >
          Bluesky uses App Passwords &mdash; a separate credential from your main
          password, created specifically for apps.
        </p>
        <p className="text-sm mb-5">
          <a
            href="https://bsky.app/settings/app-passwords"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#0085FF' }}
          >
            Create an App Password at bsky.app/settings/app-passwords
          </a>
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="bsky-handle"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--foreground)' }}
            >
              Bluesky handle
            </label>
            <input
              id="bsky-handle"
              type="text"
              placeholder="yourname.bsky.social"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              required
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="bsky-app-password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--foreground)' }}
            >
              App Password
            </label>
            <input
              id="bsky-app-password"
              type="password"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              disabled={loading}
              required
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--muted)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !identifier.trim() || !appPassword}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: '#CBFF53',
                color: '#000000',
              }}
            >
              {loading ? 'Connecting...' : 'Connect Bluesky'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
