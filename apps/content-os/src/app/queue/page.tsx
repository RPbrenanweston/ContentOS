// @crumb publishing-queue
// UI | timeline-view | scheduling-display | kanban-pipeline
// why: Visualizes publishing queue across channels with two tabs — Queues (timeline) and Pipeline (Kanban); enables creators to review, manage, and track scheduled content
// in:[/api/queue, /api/queue/slots] out:[JSX-timeline-ui] err:[fetch-failure, date-parse-error]
// edge:../../services/queue.service.ts -> CALLS
// edge:../../components/queue/queue-creation-modal.tsx -> RENDERS [modal for new queue creation]
// edge:../../components/content/kanban-board.tsx -> USES (Pipeline tab)
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { QueueSlot, PublishingQueue } from '@/domain';
import type { ContentNode } from '@/domain';
import { QueueCreationModal } from '@/components/queue/queue-creation-modal';
import { KanbanBoard } from '@/components/content/kanban-board';

type QueueTabId = 'queues' | 'pipeline';

/* ------------------------------------------------------------------ */
/*  Tab bar                                                           */
/* ------------------------------------------------------------------ */

function QueueTabBar({ active, onChange }: { active: QueueTabId; onChange: (tab: QueueTabId) => void }) {
  const tabs: { id: QueueTabId; label: string }[] = [
    { id: 'queues', label: 'Queues' },
    { id: 'pipeline', label: 'Pipeline' },
  ];
  return (
    <div
      className="flex items-center gap-1 px-4 shrink-0"
      style={{ borderBottom: '1px solid var(--theme-border)', height: '44px' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--theme-btn-primary-bg)' : 'transparent',
              color: isActive ? 'var(--theme-btn-primary-text)' : 'var(--theme-muted)',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function safeFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No date';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

function safeFormatDateGroup(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown date';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return 'Unknown date';
  }
}

function safeFormatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--:--';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--:--';
  }
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                  */
/* ------------------------------------------------------------------ */

function QueueSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <div className="h-5 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--theme-surface)' }} />
        <div className="h-8 w-32 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--theme-surface)' }} />
      </div>
      <div className="max-w-2xl mx-auto w-full py-8 px-6 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-40 rounded animate-pulse" style={{ backgroundColor: 'var(--theme-surface)' }} />
            {[1, 2].map((j) => (
              <div
                key={j}
                className="h-20 rounded-lg animate-pulse"
                style={{ backgroundColor: 'var(--theme-surface)' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                       */
/* ------------------------------------------------------------------ */

function QueueError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--theme-surface)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-foreground)' }}>
          Failed to load queue
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--theme-muted)' }}>
          Something went wrong while fetching your publishing queue. Please try again.
        </p>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function QueuePage() {
  const [activeTab, setActiveTab] = useState<QueueTabId>('queues');
  const [queues, setQueues] = useState<PublishingQueue[]>([]);
  const [slots, setSlots] = useState<QueueSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Pipeline (Kanban) content nodes
  const [pipelineNodes, setPipelineNodes] = useState<ContentNode[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [queuesRes, slotsRes] = await Promise.all([
        fetch('/api/queue'),
        fetch('/api/queue/slots?count=21'),
      ]);
      if (!queuesRes.ok || !slotsRes.ok) {
        throw new Error(`Fetch failed: queues=${queuesRes.status} slots=${slotsRes.status}`);
      }
      const queuesData = await queuesRes.json();
      const slotsData = await slotsRes.json();
      setQueues(queuesData.queues ?? []);
      setSlots(slotsData.slots ?? []);
    } catch (e) {
      console.error('Failed to load queue:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPipelineNodes = useCallback(() => {
    setPipelineLoading(true);
    fetch('/api/content?limit=200')
      .then((r) => r.json())
      .then((data) => setPipelineNodes(data.nodes ?? []))
      .catch((err) => console.error('[QueuePage] Failed to fetch pipeline nodes:', err))
      .finally(() => setPipelineLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Fetch pipeline nodes when Pipeline tab is first activated
  useEffect(() => {
    if (activeTab === 'pipeline' && pipelineNodes.length === 0 && !pipelineLoading) {
      loadPipelineNodes();
    }
  }, [activeTab, pipelineNodes.length, pipelineLoading, loadPipelineNodes]);

  const slotsByDate = slots.reduce<Record<string, QueueSlot[]>>((acc, slot) => {
    const date = safeFormatDateGroup(slot.scheduledFor);
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  if (loading && activeTab === 'queues') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <QueueTabBar active={activeTab} onChange={setActiveTab} />
        <QueueSkeleton />
      </div>
    );
  }

  if (error && activeTab === 'queues') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <QueueTabBar active={activeTab} onChange={setActiveTab} />
        <QueueError onRetry={loadData} />
      </div>
    );
  }

  // Pipeline tab
  if (activeTab === 'pipeline') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <QueueTabBar active={activeTab} onChange={setActiveTab} />
        {pipelineLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>Loading pipeline...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <KanbanBoard nodes={pipelineNodes} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <QueueTabBar active={activeTab} onChange={setActiveTab} />
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-foreground)' }}>Queue</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ border: '1px solid var(--theme-border)', color: 'var(--theme-foreground)' }}
          >
            Set up cadence
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
          >
            New Queue
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {queues.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <rect x="3" y="10" width="18" height="4" rx="1" />
                  <rect x="3" y="16" width="18" height="4" rx="1" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-foreground)' }}>Set your publishing rhythm</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--theme-muted)' }}>
                Create a cadence for each channel. Your approved pieces will
                automatically fill the queue — you just review and go.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-5 py-2.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
              >
                Create your first queue
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-8 px-6">
            {/* Active queues summary */}
            <div className="mb-8 flex gap-3 flex-wrap">
              {queues.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: q.isActive ? 'var(--theme-success)' : 'var(--theme-muted)' }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-foreground)' }}>{q.accountName}</span>
                  <span className="text-ui-sm">
                    {q.schedules?.filter((s) => s.isActive).length ?? 0} slots/week
                  </span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            {Object.entries(slotsByDate).map(([date, dateSlots]) => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--theme-foreground)' }}>{date}</h3>
                <div className="space-y-2">
                  {(dateSlots as QueueSlot[]).map((slot) => (
                    <SlotCard key={slot.id} slot={slot} />
                  ))}
                </div>
              </div>
            ))}

            {slots.length === 0 && queues.length > 0 && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                  No upcoming slots. Approve some pieces to fill your queue.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <QueueCreationModal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      onSuccess={loadData}
    />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Slot card                                                         */
/* ------------------------------------------------------------------ */

function SlotCard({ slot }: { slot: QueueSlot }) {
  const time = safeFormatTime(slot.scheduledFor);

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-lg transition-colors"
      style={{
        backgroundColor: slot.status === 'filled' ? 'var(--theme-card-bg)' : 'transparent',
        border: slot.status === 'filled'
          ? '1px solid var(--theme-card-border)'
          : '1px dashed var(--theme-border)',
      }}
    >
      <div className="text-sm font-medium w-12 pt-0.5 shrink-0" style={{ color: 'var(--theme-muted)' }}>
        {time}
      </div>

      {slot.status === 'filled' && slot.asset ? (
        <div className="flex-1 min-w-0">
          <p className="text-sm line-clamp-2" style={{ color: 'var(--theme-foreground)' }}>
            {slot.asset.body ?? 'Untitled'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-ui-sm capitalize">{slot.asset.platformHint ?? 'unknown'}</span>
            <span style={{ color: 'var(--theme-border)' }}>|</span>
            <span className="text-ui-sm capitalize">{slot.asset.assetType?.replace('_', ' ') ?? 'unknown'}</span>
          </div>
        </div>
      ) : slot.status === 'filled' && !slot.asset ? (
        <div className="flex-1 flex items-center">
          <p className="text-sm italic" style={{ color: 'var(--theme-muted)' }}>Missing asset</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center">
          <p className="text-sm italic" style={{ color: 'var(--theme-muted)' }}>Empty slot</p>
        </div>
      )}

      <div className="shrink-0">
        {slot.status === 'filled' ? (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ backgroundColor: 'var(--theme-tag-bg)', color: 'var(--theme-tag-text)' }}
          >
            Ready
          </span>
        ) : (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-muted)', border: '1px solid var(--theme-border)' }}
          >
            Empty
          </span>
        )}
      </div>
    </div>
  );
}
