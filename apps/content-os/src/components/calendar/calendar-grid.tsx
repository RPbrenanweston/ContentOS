// @crumb calendar-grid
// UI | calendar | content-scheduling
// why: Reusable monthly calendar grid for visualizing scheduled content nodes; designed for PLAN-001 display and PLAN-002 drag-drop extension
// in:[year, month, nodes[], onDayClick?, onNodeClick?] out:[JSX monthly grid] err:[none-critical]
// hazard: Date math uses local timezone; scheduledAt stored as UTC ISO string could shift day when rendered
// hazard: Nodes without scheduledAt fall back to createdAt, mixing intent (scheduled) with history (created)
// edge:../../domain/content-node.ts -> READS (ContentNode type)
// edge:../../domain/enums.ts -> READS (ContentNodeStatus)
// edge:../../app/plan/page.tsx -> USED-BY
// prompt: Add timezone-aware date parsing; distinguish scheduled vs created fallback visually; consider data-drag-id attributes for PLAN-002 drag-drop

'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentNode, ContentNodeStatus } from '@/domain';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CalendarNode {
  id: string;
  title: string;
  status: ContentNodeStatus;
  date: string; // ISO date string (YYYY-MM-DD) in local time
}

export interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  nodes: CalendarNode[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTodayClick: () => void;
  onDayClick?: (dateStr: string) => void;
  onNodeClick?: (nodeId: string) => void;
  /** Optional element rendered on the right side of the calendar header */
  headerExtra?: ReactNode;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Status pill colors — using CSS variables from theme
const STATUS_PILL: Record<ContentNodeStatus, { bg: string; text: string }> = {
  draft:      { bg: 'rgba(107, 112, 103, 0.25)', text: 'var(--theme-muted)' },
  processing: { bg: 'rgba(212, 248, 90, 0.15)',  text: 'var(--theme-primary)' },
  ready:      { bg: 'rgba(16, 185, 129, 0.2)',   text: 'var(--theme-success)' },
  published:  { bg: 'rgba(59, 130, 246, 0.2)',   text: '#93C5FD' },
  archived:   { bg: 'rgba(107, 112, 103, 0.15)', text: 'var(--theme-muted)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD string from a Date in local time */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's date as YYYY-MM-DD in local time */
function todayStr(): string {
  return toLocalDateStr(new Date());
}

/**
 * Build the calendar grid cells for a given year/month.
 * Grid always starts on Monday (ISO week). Returns an array of date strings
 * (or null for padding cells before/after the month).
 */
function buildCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // ISO weekday of the first day: Mon=1..Sun=7; we want Mon as col 0
  const firstIso = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // Sun=0 -> 7
  const leadingBlanks = firstIso - 1; // Mon = 0 blanks, Tue = 1, …

  const days: (string | null)[] = [];

  // Leading blanks
  for (let i = 0; i < leadingBlanks; i++) {
    days.push(null);
  }

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push(toLocalDateStr(date));
  }

  // Trailing blanks to complete the last row
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ContentPill({
  node,
  onNodeClick,
}: {
  node: CalendarNode;
  onNodeClick?: (id: string) => void;
}) {
  const pill = STATUS_PILL[node.status] ?? STATUS_PILL.draft;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onNodeClick?.(node.id);
      }}
      title={node.title}
      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight truncate transition-opacity hover:opacity-80"
      style={{
        backgroundColor: pill.bg,
        color: pill.text,
      }}
      data-node-id={node.id}
    >
      {node.title}
    </button>
  );
}

function DayCell({
  dateStr,
  nodes,
  isToday,
  isCurrentMonth,
  onDayClick,
  onNodeClick,
}: {
  dateStr: string | null;
  nodes: CalendarNode[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onDayClick?: (dateStr: string) => void;
  onNodeClick?: (nodeId: string) => void;
}) {
  if (!dateStr) {
    return (
      <div
        className="min-h-[90px] p-1"
        style={{ backgroundColor: 'var(--theme-background)', borderRight: '1px solid var(--theme-border)', borderBottom: '1px solid var(--theme-border)' }}
      />
    );
  }

  const dayNumber = parseInt(dateStr.split('-')[2], 10);

  return (
    <div
      className="min-h-[90px] p-1 cursor-pointer transition-colors relative"
      style={{
        backgroundColor: isToday ? 'rgba(212, 248, 90, 0.04)' : 'var(--theme-background)',
        borderRight: '1px solid var(--theme-border)',
        borderBottom: '1px solid var(--theme-border)',
        opacity: isCurrentMonth ? 1 : 0.4,
      }}
      onClick={() => onDayClick?.(dateStr)}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="w-5 h-5 flex items-center justify-center rounded text-[11px] font-semibold"
          style={{
            backgroundColor: isToday ? 'var(--theme-primary)' : 'transparent',
            color: isToday ? 'var(--theme-btn-primary-text)' : 'var(--theme-muted)',
          }}
        >
          {dayNumber}
        </span>
        {nodes.length === 0 && (
          <span
            className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--theme-muted)' }}
          >
            +
          </span>
        )}
      </div>

      {/* Content pills — show up to 3, +N overflow */}
      <div className="space-y-0.5">
        {nodes.slice(0, 3).map((node) => (
          <ContentPill key={node.id} node={node} onNodeClick={onNodeClick} />
        ))}
        {nodes.length > 3 && (
          <span className="text-[9px] pl-1" style={{ color: 'var(--theme-muted)' }}>
            +{nodes.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CalendarGrid({
  year,
  month,
  nodes,
  onPrevMonth,
  onNextMonth,
  onTodayClick,
  onDayClick,
  onNodeClick,
  headerExtra,
}: CalendarGridProps) {
  const today = todayStr();
  const calendarDays = buildCalendarDays(year, month);

  // Index nodes by YYYY-MM-DD date string for O(1) lookup per cell
  const nodesByDate = new Map<string, CalendarNode[]>();
  for (const node of nodes) {
    const existing = nodesByDate.get(node.date) ?? [];
    existing.push(node);
    nodesByDate.set(node.date, existing);
  }

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--theme-background)' }}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div
        className="h-12 flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-foreground)' }}>
            {monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {headerExtra}
          <button
            onClick={onTodayClick}
            className="px-3 py-1 text-xs font-medium rounded transition-colors"
            style={{
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--theme-foreground)';
              e.currentTarget.style.borderColor = 'var(--theme-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--theme-muted)';
              e.currentTarget.style.borderColor = 'var(--theme-border)';
            }}
          >
            Today
          </button>

          <div className="flex items-center" style={{ border: '1px solid var(--theme-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={onPrevMonth}
              className="px-2.5 py-1.5 transition-colors"
              style={{ color: 'var(--theme-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--theme-surface)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label="Previous month"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div style={{ width: '1px', backgroundColor: 'var(--theme-border)', alignSelf: 'stretch' }} />
            <button
              onClick={onNextMonth}
              className="px-2.5 py-1.5 transition-colors"
              style={{ color: 'var(--theme-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--theme-surface)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label="Next month"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Day-of-week labels ──────────────────────────────────────────── */}
      <div
        className="grid grid-cols-7 shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--theme-muted)' }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ─── Calendar grid ───────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ borderLeft: '1px solid var(--theme-border)' }}
      >
        <div className="grid grid-cols-7">
          {calendarDays.map((dateStr, idx) => {
            const cellNodes = dateStr ? (nodesByDate.get(dateStr) ?? []) : [];
            const isToday = dateStr === today;
            // All cells in this component are for the current month (blanks are null)
            const isCurrentMonth = dateStr !== null;

            return (
              <DayCell
                key={dateStr ?? `blank-${idx}`}
                dateStr={dateStr}
                nodes={cellNodes}
                isToday={isToday}
                isCurrentMonth={isCurrentMonth}
                onDayClick={onDayClick}
                onNodeClick={onNodeClick}
              />
            );
          })}
        </div>
      </div>

      {/* ─── Legend ─────────────────────────────────────────────────────── */}
      <div
        className="h-9 flex items-center gap-4 px-4 shrink-0"
        style={{ borderTop: '1px solid var(--theme-border)' }}
      >
        {(Object.keys(STATUS_PILL) as ContentNodeStatus[]).map((status) => {
          const pill = STATUS_PILL[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: pill.bg, border: `1px solid ${pill.text}`, opacity: 0.8 }}
              />
              <span className="text-[10px] capitalize" style={{ color: 'var(--theme-muted)' }}>
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Utility: Convert ContentNode[] to CalendarNode[] ────────────────────────

/**
 * Maps content nodes to calendar nodes using createdAt as the date.
 * The ContentNode domain type has no scheduledAt field; use createdAt.
 */
export function toCalendarNodes(nodes: ContentNode[]): CalendarNode[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title,
    status: node.status,
    date: toLocalDateStr(new Date(node.createdAt)),
  }));
}
