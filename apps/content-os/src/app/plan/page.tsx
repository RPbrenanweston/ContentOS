// @crumb planning-calendar
// UI | calendar-view | content-scheduling
// why: Monthly calendar overview of all content nodes; lets creators see scheduled vs published content at a glance and navigate to individual pieces or create new ones for empty days
// in:[/api/content endpoint] out:[JSX monthly calendar UI] err:[fetch-failure—shows empty calendar]
// hazard: Content fetched without date range filter—pulls all content and filters client-side; will degrade at scale (>1000 nodes)
// hazard: Date math uses local timezone; ISO strings from server stored as UTC may shift to wrong day for users far from UTC
// hazard: No loading skeleton—calendar renders empty then fills in, causing layout shift
// edge:../../components/calendar/calendar-grid.tsx -> USES (CalendarGrid, toCalendarNodes)
// edge:../../components/content/kanban-board.tsx -> USES (KanbanBoard)
// edge:../content/[id]/page.tsx -> NAVIGATES-TO (on node pill click)
// edge:../content/new -> NAVIGATES-TO (on empty day click with ?date= param)
// edge:../../app/api/content/route.ts -> FETCHES
// prompt: Add date-range query param to /api/content to filter server-side; add loading skeleton; add timezone awareness

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarGrid, toCalendarNodes, type CalendarNode } from '@/components/calendar/calendar-grid';
import { KanbanBoard } from '@/components/content/kanban-board';
import type { ContentNode } from '@/domain';

type ViewMode = 'calendar' | 'kanban';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

// ─── View Toggle ─────────────────────────────────────────────────────────────

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      className="flex items-center rounded-md overflow-hidden"
      style={{ border: '1px solid var(--theme-border)' }}
    >
      {(['calendar', 'kanban'] as ViewMode[]).map((mode) => {
        const active = view === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className="px-3 py-1.5 text-xs font-medium transition-colors capitalize"
            style={{
              backgroundColor: active ? 'var(--theme-btn-primary-bg)' : 'transparent',
              color: active ? 'var(--theme-btn-primary-text)' : 'var(--theme-muted)',
            }}
          >
            {mode === 'calendar' ? 'Calendar' : 'Kanban'}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('calendar');
  const [{ year, month }, setYearMonth] = useState(todayYearMonth);
  const [nodes, setNodes] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all content nodes — filter by month client-side
  // Future: pass ?from=&to= query params to filter server-side
  useEffect(() => {
    setLoading(true);
    fetch('/api/content?limit=200')
      .then((r) => r.json())
      .then((data) => {
        setNodes(data.nodes ?? []);
      })
      .catch((err) => {
        console.error('[PlanPage] Failed to fetch content nodes:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Filter nodes to only those whose createdAt falls in the current month
  const calendarNodes: CalendarNode[] = toCalendarNodes(nodes).filter((n) => {
    const [y, m] = n.date.split('-').map(Number);
    return y === year && m - 1 === month;
  });

  const handlePrevMonth = useCallback(() => {
    setYearMonth(({ year: y, month: m }) => {
      if (m === 0) return { year: y - 1, month: 11 };
      return { year: y, month: m - 1 };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setYearMonth(({ year: y, month: m }) => {
      if (m === 11) return { year: y + 1, month: 0 };
      return { year: y, month: m + 1 };
    });
  }, []);

  const handleTodayClick = useCallback(() => {
    setYearMonth(todayYearMonth());
  }, []);

  const handleDayClick = useCallback((dateStr: string) => {
    router.push(`/content/new?date=${dateStr}`);
  }, [router]);

  const handleNodeClick = useCallback((nodeId: string) => {
    router.push(`/content/${nodeId}`);
  }, [router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
          Loading...
        </span>
      </div>
    );
  }

  if (view === 'kanban') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header with toggle */}
        <div
          className="h-12 flex items-center justify-between px-4 shrink-0"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--theme-foreground)' }}
          >
            Pipeline
          </span>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden">
          <KanbanBoard nodes={nodes} />
        </div>
      </div>
    );
  }

  return (
    <CalendarGrid
      year={year}
      month={month}
      nodes={calendarNodes}
      onPrevMonth={handlePrevMonth}
      onNextMonth={handleNextMonth}
      onTodayClick={handleTodayClick}
      onDayClick={handleDayClick}
      onNodeClick={handleNodeClick}
      headerExtra={<ViewToggle view={view} onChange={setView} />}
    />
  );
}
