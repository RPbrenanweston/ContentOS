'use client';

import { useEffect, useState } from 'react';

interface HealthData {
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorMessage: string | null;
}

interface Props {
  accountId: string;
  accountName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function HealthDrawer({ accountId, accountName, isOpen, onClose }: Props) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/accounts/${accountId}/health`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHealth(data))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, [isOpen, accountId]);

  if (!isOpen) return null;

  const severity =
    (health?.consecutiveFailures ?? 0) >= 5
      ? 'critical'
      : (health?.consecutiveFailures ?? 0) >= 3
        ? 'warning'
        : 'info';

  const severityColor =
    severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : 'var(--muted)';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 60,
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: '90vw',
          background: 'var(--card)',
          borderLeft: '1px solid var(--card-border)',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
            Health — {accountName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading health data…</p>
          ) : !health ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Unable to load health data.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Severity badge */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: `${severityColor}15`,
                  border: `1px solid ${severityColor}30`,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: severityColor,
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {severity === 'critical'
                    ? '🔴 Critical — Multiple consecutive failures'
                    : severity === 'warning'
                      ? '🟡 Warning — Failures detected'
                      : 'ℹ️ Minor issue'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  {health.consecutiveFailures} consecutive failure
                  {health.consecutiveFailures !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Last Failure
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--foreground)', margin: 0 }}>
                    {health.lastFailureAt
                      ? new Date(health.lastFailureAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Never'}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Last Success
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--foreground)', margin: 0 }}>
                    {health.lastSuccessAt
                      ? new Date(health.lastSuccessAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Never'}
                  </p>
                </div>

                {health.lastErrorMessage && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Error Message
                    </p>
                    <pre
                      style={{
                        fontSize: 12,
                        color: '#ef4444',
                        background: 'rgba(239,68,68,0.08)',
                        padding: '8px 12px',
                        borderRadius: 6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {health.lastErrorMessage}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
