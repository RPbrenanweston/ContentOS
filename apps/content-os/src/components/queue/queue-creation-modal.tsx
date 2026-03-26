// @crumb queue-creation-modal
// UI | queue management | modal form | account selection
// why: Allow users to create a publishing queue tied to a distribution account—name, platform filter, account multi-select, timezone
// in:[open: bool, onClose callback, onSuccess callback] out:[POST /api/queue on submit] err:[fetch failure, validation error, API error]
// hazard: Account list is fetched fresh on every modal open—no caching; slow connections show empty list until resolved
// hazard: Timezone list from Intl.supportedValuesOf('timeZone') varies by browser/OS—exotic timezones may not be recognized by the server
// edge:../../app/api/queue/route.ts -> CALLS [POST /api/queue]
// edge:../../app/api/distribution/accounts/route.ts -> READS [GET /api/distribution/accounts]
// edge:../../domain/distribution.ts -> READS [DistributionAccount]
// edge:../../domain/enums.ts -> READS [Platform]
// prompt: Add optimistic update for queue list after creation. Validate timezone client-side before submit.

'use client';

import { useEffect, useState } from 'react';
import type { DistributionAccount } from '@/domain';
import type { Platform } from '@/domain';

interface QueueCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PLATFORMS: Platform[] = [
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'instagram',
  'newsletter',
  'bluesky',
  'threads',
  'reddit',
];

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
  }
})();

export function QueueCreationModal({ open, onClose, onSuccess }: QueueCreationModalProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [accounts, setAccounts] = useState<DistributionAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState('UTC');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts when modal opens
  useEffect(() => {
    if (!open) return;

    setLoadingAccounts(true);
    setError(null);

    fetch('/api/distribution/accounts')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load accounts');
        return r.json();
      })
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setError('Could not load distribution accounts. Please try again.'))
      .finally(() => setLoadingAccounts(false));
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName('');
      setPlatform('');
      setSelectedAccountIds(new Set());
      setTimezone('UTC');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Filter accounts by selected platform
  const filteredAccounts = platform
    ? accounts.filter((a) => a.platform === platform && a.isActive)
    : accounts.filter((a) => a.isActive);

  // Deselect accounts that are no longer visible when platform changes
  const handlePlatformChange = (newPlatform: Platform | '') => {
    setPlatform(newPlatform);
    // Clear selections that don't match the new platform filter
    if (newPlatform) {
      setSelectedAccountIds((prev) => {
        const validIds = new Set(
          accounts
            .filter((a) => a.platform === newPlatform && a.isActive)
            .map((a) => a.id)
        );
        const next = new Set<string>();
        for (const id of prev) {
          if (validIds.has(id)) next.add(id);
        }
        return next;
      });
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Queue name is required.');
      return;
    }
    if (selectedAccountIds.size === 0) {
      setError('Select at least one distribution account.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Create one queue per selected account (each queue ties to one distribution account)
      const accountId = Array.from(selectedAccountIds)[0];

      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionAccountId: accountId,
          name: name.trim(),
          timezone,
          schedule: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create queue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="w-full max-w-md rounded-xl shadow-xl flex flex-col"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            border: '1px solid var(--theme-card-border)',
            pointerEvents: 'auto',
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--theme-border)' }}
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--theme-foreground)' }}>
              New Queue
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--theme-muted)' }}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="queue-name"
                className="block text-xs font-medium"
                style={{ color: 'var(--theme-foreground)' }}
              >
                Queue Name
              </label>
              <input
                id="queue-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. LinkedIn Morning"
                className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-foreground)',
                }}
                disabled={submitting}
              />
            </div>

            {/* Platform filter */}
            <div className="space-y-1.5">
              <label
                htmlFor="queue-platform"
                className="block text-xs font-medium"
                style={{ color: 'var(--theme-foreground)' }}
              >
                Platform
              </label>
              <select
                id="queue-platform"
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value as Platform | '')}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: platform ? 'var(--theme-foreground)' : 'var(--theme-muted)',
                }}
                disabled={submitting}
              >
                <option value="">All platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} style={{ color: 'var(--theme-foreground)' }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Account multi-select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: 'var(--theme-foreground)' }}>
                Distribution Accounts
                {selectedAccountIds.size > 0 && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--theme-muted)' }}>
                    {selectedAccountIds.size} selected
                  </span>
                )}
              </label>

              {loadingAccounts ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg animate-pulse"
                      style={{ backgroundColor: 'var(--theme-surface)' }}
                    />
                  ))}
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div
                  className="py-6 text-center text-sm rounded-lg"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: '1px dashed var(--theme-border)',
                    color: 'var(--theme-muted)',
                  }}
                >
                  {platform
                    ? `No active ${platform} accounts connected.`
                    : 'No active accounts connected.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {filteredAccounts.map((account) => {
                    const isSelected = selectedAccountIds.has(account.id);
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleAccount(account.id)}
                        disabled={submitting}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-surface)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--theme-btn-primary-bg)' : 'var(--theme-border)'}`,
                        }}
                      >
                        {/* Checkbox indicator */}
                        <div
                          className="w-4 h-4 flex items-center justify-center rounded shrink-0 transition-colors"
                          style={{
                            backgroundColor: isSelected ? 'var(--theme-btn-primary-bg)' : 'transparent',
                            border: `1px solid ${isSelected ? 'var(--theme-btn-primary-bg)' : 'var(--theme-border)'}`,
                          }}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="var(--theme-btn-primary-text)" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Platform badge */}
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded shrink-0 capitalize"
                          style={{
                            backgroundColor: 'var(--theme-tag-bg)',
                            color: 'var(--theme-tag-text)',
                          }}
                        >
                          {account.platform}
                        </span>

                        {/* Account name */}
                        <span
                          className="text-sm truncate"
                          style={{ color: 'var(--theme-foreground)' }}
                        >
                          {account.accountName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label
                htmlFor="queue-timezone"
                className="block text-xs font-medium"
                style={{ color: 'var(--theme-foreground)' }}
              >
                Timezone
              </label>
              <select
                id="queue-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-foreground)',
                }}
                disabled={submitting}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-muted)',
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--theme-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-foreground)',
                backgroundColor: 'transparent',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedAccountIds.size === 0 || !name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--theme-btn-primary-bg)',
                color: 'var(--theme-btn-primary-text)',
              }}
            >
              {submitting ? 'Creating...' : 'Create Queue'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
