'use client';

import { useEffect, useState, useCallback } from 'react';
import type { QueueSlot, PublishingQueue } from '@/domain';

export default function QueuePage() {
  const [queues, setQueues] = useState<PublishingQueue[]>([]);
  const [slots, setSlots] = useState<QueueSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [queuesRes, slotsRes] = await Promise.all([
        fetch('/api/queue'),
        fetch('/api/queue/slots?count=21'),
      ]);
      const queuesData = await queuesRes.json();
      const slotsData = await slotsRes.json();
      setQueues(queuesData.queues ?? []);
      setSlots(slotsData.slots ?? []);
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const slotsByDate = slots.reduce<Record<string, QueueSlot[]>>((acc, slot) => {
    const date = new Date(slot.scheduledFor).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>Loading queue...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-foreground)' }}>Queue</h1>
        <button
          className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
          style={{ border: '1px solid var(--theme-border)', color: 'var(--theme-foreground)' }}
        >
          Set up cadence
        </button>
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
                  {dateSlots.map((slot) => (
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
  );
}

function SlotCard({ slot }: { slot: QueueSlot }) {
  const time = new Date(slot.scheduledFor).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

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
          <p className="text-sm line-clamp-2" style={{ color: 'var(--theme-foreground)' }}>{slot.asset.body}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-ui-sm capitalize">{slot.asset.platformHint}</span>
            <span style={{ color: 'var(--theme-border)' }}>|</span>
            <span className="text-ui-sm capitalize">{slot.asset.assetType?.replace('_', ' ')}</span>
          </div>
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
