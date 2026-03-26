// @crumb planning-page
// UI | tabs | frameworks | calendar-view | kanban-view
// why: Top-level /plan page hosting three views — Frameworks (writing planner), Calendar (monthly scheduling), Kanban (pipeline); preserves original frameworks planner alongside PLAN-001/PLAN-003 additions
// in:[user tab selection] out:[active view JSX] err:[fetch-failure in calendar/kanban—delegates to child components]
// hazard: Content fetched without date range filter—pulls all content and filters client-side; will degrade at scale (>1000 nodes)
// hazard: Date math uses local timezone; ISO strings from server stored as UTC may shift to wrong day for users far from UTC
// edge:../../components/plan/writing-frameworks.tsx -> USES (WritingFrameworks)
// edge:../../components/calendar/calendar-grid.tsx -> USES (CalendarGrid, toCalendarNodes)
// edge:../../components/content/kanban-board.tsx -> USES (KanbanBoard)
// edge:../content/[id]/page.tsx -> NAVIGATES-TO (on node click)
// edge:../content/new -> NAVIGATES-TO (on empty day click)
// edge:../../app/api/content/route.ts -> FETCHES (calendar and kanban views)
// prompt: Add date-range query param to /api/content to filter server-side; add loading skeleton; add timezone awareness

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WritingFrameworks } from '@/components/plan/writing-frameworks';
import { CalendarGrid, toCalendarNodes, type CalendarNode } from '@/components/calendar/calendar-grid';
import { KanbanBoard } from '@/components/content/kanban-board';
import { frameworkCategories } from '@/lib/frameworks';
import type { ContentNode } from '@/domain';

type TabId = 'frameworks' | 'calendar' | 'kanban';

const TABS: { id: TabId; label: string }[] = [
  { id: 'frameworks', label: 'Frameworks' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'kanban', label: 'Kanban' },
];

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <div
      className="flex items-center gap-1 px-4 shrink-0"
      style={{ borderBottom: '1px solid var(--theme-border)', height: '44px' }}
    >
      {TABS.map((tab) => {
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
      {/* Framework count badge — visible only on Frameworks tab */}
      {active === 'frameworks' && (
        <span className="ml-2 text-[10px]" style={{ color: 'var(--theme-muted)' }}>
          {frameworkCategories.length} categories &middot;{' '}
          {frameworkCategories.reduce((s, c) => s + c.frameworks.length, 0)} frameworks
        </span>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  nodes,
  setNodes,
}: {
  nodes: ContentNode[];
  setNodes: React.Dispatch<React.SetStateAction<ContentNode[]>>;
}) {
  const router = useRouter();
  const [{ year, month }, setYearMonth] = useState(todayYearMonth);

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
          console.error('[PlanPage] Reschedule failed, rolling back:', err);
          setNodes(previousNodes);
        })
        .then((res) => {
          if (res && !res.ok) {
            console.error('[PlanPage] Reschedule API error, rolling back:', res.status);
            setNodes(previousNodes);
          }
        });
    },
    [nodes, setNodes]
  );

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
      onNodeReschedule={handleNodeReschedule}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const [activeTab, setActiveTab] = useState<TabId>('frameworks');
  const [nodes, setNodes] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch content nodes for calendar + kanban views
  useEffect(() => {
    setLoading(true);
    fetch('/api/content?limit=200')
      .then((r) => r.json())
      .then((data) => setNodes(data.nodes ?? []))
      .catch((err) => console.error('[PlanPage] Failed to fetch content nodes:', err))
      .finally(() => setLoading(false));
  }, []);

  const contentLoading = (
    <div className="h-full flex items-center justify-center">
      <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>Loading...</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'frameworks' && <WritingFrameworks />}

        {activeTab === 'calendar' && (
          loading ? contentLoading : <CalendarView nodes={nodes} setNodes={setNodes} />
        )}

        {activeTab === 'kanban' && (
          loading ? (
            contentLoading
          ) : (
            <div className="h-full overflow-hidden">
              <KanbanBoard nodes={nodes} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
