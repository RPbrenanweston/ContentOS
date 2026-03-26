// @crumb kanban-board
// UI | kanban-view | content-pipeline
// why: Displays content nodes grouped by status in a kanban board layout for pipeline visibility
// in:[ContentNode[]] out:[JSX-kanban-ui] err:[empty-states per column]
// hazard: Clicking card uses window.location.href instead of router—kept consistent with existing patterns
// edge:../../domain/enums.ts -> READS [ContentNodeStatus]
// edge:../../domain/content-node.ts -> READS [ContentNode]
// edge:../../../app/content/[id] -> NAVIGATES-TO

'use client';

import { useRouter } from 'next/navigation';
import type { ContentNode, ContentNodeStatus } from '@/domain';

const COLUMNS: { status: ContentNodeStatus; label: string; headerColor: string; dotColor: string }[] = [
  {
    status: 'draft',
    label: 'Draft',
    headerColor: 'rgba(107, 112, 103, 0.15)',
    dotColor: '#6B7067',
  },
  {
    status: 'processing',
    label: 'Processing',
    headerColor: 'rgba(212, 248, 90, 0.12)',
    dotColor: '#D4F85A',
  },
  {
    status: 'ready',
    label: 'Ready',
    headerColor: 'rgba(16, 185, 129, 0.12)',
    dotColor: '#10B981',
  },
  {
    status: 'published',
    label: 'Published',
    headerColor: 'rgba(212, 248, 90, 0.08)',
    dotColor: '#D4F85A',
  },
  {
    status: 'archived',
    label: 'Archived',
    headerColor: 'rgba(56, 60, 53, 0.4)',
    dotColor: '#383C35',
  },
];

const CONTENT_TYPE_ICONS: Record<string, string> = {
  blog: 'B',
  video: 'V',
  audio: 'A',
};

function ContentCard({ node }: { node: ContentNode }) {
  const router = useRouter();
  const date = new Date(node.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <button
      onClick={() => router.push(`/content/${node.id}`)}
      className="w-full text-left p-3 rounded-md transition-all"
      style={{
        backgroundColor: 'var(--theme-surface)',
        border: '1px solid var(--theme-card-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--theme-card-hover-border)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--theme-card-border)';
      }}
    >
      {/* Title */}
      <p
        className="text-sm font-medium leading-snug line-clamp-2 mb-2"
        style={{ color: 'var(--theme-foreground)' }}
      >
        {node.title}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        {/* Content type badge + tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Content type pill */}
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
            style={{
              backgroundColor: 'var(--theme-tag-bg)',
              color: 'var(--theme-tag-text)',
            }}
            title={node.contentType}
          >
            {CONTENT_TYPE_ICONS[node.contentType] ?? '?'}
          </span>

          {/* Tags (first 2) */}
          {node.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-block px-1.5 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: 'var(--theme-tag-bg)',
                color: 'var(--theme-tag-text)',
                border: '1px solid var(--theme-tag-border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Date */}
        <span
          className="text-[10px] shrink-0"
          style={{ color: 'var(--theme-muted)' }}
        >
          {date}
        </span>
      </div>
    </button>
  );
}

interface KanbanBoardProps {
  nodes: ContentNode[];
}

export function KanbanBoard({ nodes }: KanbanBoardProps) {
  const grouped = COLUMNS.reduce<Record<ContentNodeStatus, ContentNode[]>>(
    (acc, col) => {
      acc[col.status] = nodes.filter((n) => n.status === col.status);
      return acc;
    },
    {} as Record<ContentNodeStatus, ContentNode[]>,
  );

  return (
    <div className="flex gap-3 h-full overflow-x-auto px-4 py-4">
      {COLUMNS.map((col) => {
        const colNodes = grouped[col.status] ?? [];
        return (
          <div
            key={col.status}
            className="flex flex-col shrink-0 w-[260px]"
            style={{
              borderRadius: '8px',
              border: '1px solid var(--theme-border)',
              backgroundColor: 'var(--theme-background)',
            }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-t-lg"
              style={{ backgroundColor: col.headerColor }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: col.dotColor }}
                />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--theme-foreground)' }}
                >
                  {col.label}
                </span>
              </div>
              <span
                className="text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded"
                style={{
                  color: 'var(--theme-muted)',
                  backgroundColor: 'var(--theme-surface)',
                }}
              >
                {colNodes.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {colNodes.length === 0 ? (
                <div
                  className="flex items-center justify-center h-16 rounded-md text-[11px]"
                  style={{
                    color: 'var(--theme-muted)',
                    border: '1px dashed var(--theme-border)',
                  }}
                >
                  No items
                </div>
              ) : (
                colNodes.map((node) => (
                  <ContentCard key={node.id} node={node} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
