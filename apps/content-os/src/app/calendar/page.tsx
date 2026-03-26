// @crumb calendar-page
// UI | calendar-view | monthly-scheduling
// why: Dedicated monthly content calendar with drag-drop rescheduling; promoted from a tab inside /plan to its own top-level route
// in:[/api/content] out:[JSX-calendar-ui] err:[fetch-failure delegates to inline error state]
// hazard: Content fetched without date range filter — pulls all content and filters client-side; will degrade at scale (>1000 nodes)
// hazard: Date math uses local timezone; ISO strings from server stored as UTC may shift to wrong day for users far from UTC
// edge:../../components/calendar/calendar-grid.tsx -> USES (CalendarGrid, toCalendarNodes)
// edge:../content/[id]/page.tsx -> NAVIGATES-TO (on node click)
// edge:../content/new -> NAVIGATES-TO (on empty day click)
// edge:../../app/api/content/route.ts -> FETCHES
// prompt: Add date-range query param to /api/content to filter server-side; add loading skeleton; add timezone awareness

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarGrid, toCalendarNodes, type CalendarNode } from '@/components/calendar/calendar-grid';
import type { ContentNode } from '@/domain';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <div className="h-5 w-40 rounded animate-pulse" style={{ backgroundColor: 'var(--theme-surface)' }} />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--theme-surface)' }} />
          <div className="h-8 w-8 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--theme-surface)' }} />
          <div className="h-8 w-8 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--theme-surface)' }} />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>Loading calendar...</span>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function CalendarError({ onRetry }: { onRetry: () => void }) {
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
          Failed to load calendar
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--theme-muted)' }}>
          Something went wrong while fetching your content. Please try again.
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [{ year, month }, setYearMonth] = useState(todayYearMonth);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch('/api/content?limit=200')
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => setNodes(data.nodes ?? []))
      .catch((err) => {
        console.error('[CalendarPage] Failed to fetch content nodes:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const calendarNodes: CalendarNode[] = toCalendarNodes(nodes).filter((n) => {
    const [y, m] = n.date.split('-').map(Number);
    return y === year && m - 1 === month;
  });

  const handlePrevMonth = useCallback(() => {
    setYearMonth(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    );
  }, []);

  const handleNextMonth = useCallback(() => {
    setYearMonth(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    );
  }, []);

  const handleTodayClick = useCallback(() => setYearMonth(todayYearMonth()), []);

  const handleDayClick = useCallback(
    (dateStr: string) => router.push(`/content/new?date=${dateStr}`),
    [router]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => router.push(`/content/${nodeId}`),
    [router]
  );

  const handleNodeReschedule = useCallback(
    (nodeId: string, newDate: string) => {
      const previousNodes = nodes;

      setNodes((prev) =>
        prev.map((n) =>
          n.id !== nodeId
            ? n
            : { ...n, metadata: { ...n.metadata, scheduledDate: newDate } }
        )
      );

      fetch(`/api/content/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...(nodes.find((n) => n.id === nodeId)?.metadata ?? {}),
            scheduledDate: newDate,
          },
        }),
      })
        .catch((err) => {
          console.error('[CalendarPage] Reschedule failed, rolling back:', err);
          setNodes(previousNodes);
        })
        .then((res) => {
          if (res && !res.ok) {
            console.error('[CalendarPage] Reschedule API error, rolling back:', res.status);
            setNodes(previousNodes);
          }
        });
    },
    [nodes, setNodes]
  );

  if (loading) return <CalendarSkeleton />;
  if (error) return <CalendarError onRetry={loadData} />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <CalendarGrid
        year={year}
        month={month}
        nodes={calendarNodes}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onTodayClick={handleTodayClick}
        onDayClick={handleDayClick}
        onNodeClick={handleNodeClick}
        onNodeReschedule={handleNodeReschedule}
      />
    </div>
  );
}
