// @crumb publish-panel
// UI | Distribution control | Account selection | Scheduling
// why: User-facing panel for publishing derived assets to multiple social/email platforms with optional scheduling
// in:[assetId, onPublished callback] out:[DistributionJob[] array] err:[fetch failure, invalid datetime, no accounts]
// hazard: Unhandled fetch errors silently fail (catch with no alert)—user thinks publish succeeded when API is down
// hazard: Scheduled datetime stored as string without timezone normalization—daylight saving transitions could misfire jobs
// edge:../content/status-badge.tsx -> RELATES [job status display]
// edge:./asset-card.tsx -> CALLS [publish triggered from asset card PUBLISH button]
// edge:../../domain/distribution.ts -> WRITES [creates DistributionJob records]
// edge:../../services/distribution.service.ts -> CALLS [/api/distribution/publish endpoint]
// prompt: Add explicit error UI for fetch failures. Convert scheduled datetime to ISO UTC before POST. Log skipped jobs clearly.

'use client';

import { useEffect, useState } from 'react';
import type { DistributionAccount, DistributionJob } from '@/domain';

interface PublishPanelProps {
  assetId: string;
  onPublished: (jobs: DistributionJob[]) => void;
}

export function PublishPanel({ assetId, onPublished }: PublishPanelProps) {
  const [accounts, setAccounts] = useState<DistributionAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [jobs, setJobs] = useState<DistributionJob[]>([]);

  useEffect(() => {
    fetch('/api/distribution/accounts')
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => {});

    fetch(`/api/distribution/jobs?assetId=${assetId}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => {});
  }, [assetId]);

  const toggleAccount = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePublish = async () => {
    if (selectedIds.size === 0) return;
    setPublishing(true);

    try {
      const res = await fetch('/api/distribution/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          accountIds: Array.from(selectedIds),
          scheduledAt: scheduledAt || undefined,
        }),
      });

      if (!res.ok) throw new Error('Publish failed');
      const data = await res.json();
      setJobs((prev) => [...(data.jobs ?? []), ...prev]);
      setSelectedIds(new Set());
      onPublished(data.jobs ?? []);
    } catch (e) {
      console.error('Publish failed:', e);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Account selection */}
      <div className="font-button text-xs text-muted">TARGET ACCOUNTS</div>
      {accounts.length === 0 ? (
        <div className="font-small text-muted">
          No accounts connected.{' '}
          <a href="/accounts" className="text-primary hover:underline">
            Connect →
          </a>
        </div>
      ) : (
        <div className="space-y-1">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => toggleAccount(account.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 border text-left transition-colors ${
                selectedIds.has(account.id)
                  ? 'border-primary text-primary'
                  : 'border-border text-muted hover:border-muted'
              }`}
            >
              <div
                className={`w-3 h-3 border ${
                  selectedIds.has(account.id)
                    ? 'border-primary bg-primary'
                    : 'border-muted'
                }`}
              />
              <span className="font-button text-[10px]">
                {account.platform.toUpperCase()}
              </span>
              <span className="font-small text-xs truncate">
                {account.accountName}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Schedule */}
      <div className="font-button text-xs text-muted">SCHEDULE (OPTIONAL)</div>
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        className="w-full bg-background border border-border text-foreground text-xs p-2 font-mono focus:outline-none focus:border-primary"
      />

      {/* Publish button */}
      <button
        onClick={handlePublish}
        disabled={publishing || selectedIds.size === 0}
        className="w-full py-2 bg-primary text-background font-button text-xs hover:bg-transparent hover:text-primary border border-primary transition-colors disabled:opacity-50"
      >
        {publishing
          ? 'PUBLISHING...'
          : scheduledAt
            ? `SCHEDULE TO ${selectedIds.size} PLATFORM${selectedIds.size !== 1 ? 'S' : ''}`
            : `PUBLISH TO ${selectedIds.size} PLATFORM${selectedIds.size !== 1 ? 'S' : ''}`}
      </button>

      {/* Job history */}
      {jobs.length > 0 && (
        <div>
          <div className="font-button text-xs text-muted mt-3 mb-1">JOB HISTORY</div>
          <div className="space-y-1">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-2 py-1 border border-border"
              >
                <span className="font-small text-xs text-muted">
                  {job.id.slice(0, 8)}
                </span>
                <span
                  className={`font-button text-[10px] ${
                    job.status === 'published'
                      ? 'text-primary'
                      : job.status === 'failed'
                        ? 'text-accent'
                        : job.status === 'scheduled'
                          ? 'text-foreground'
                          : 'text-muted'
                  }`}
                >
                  {job.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
