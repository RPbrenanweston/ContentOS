// @crumb content-library
// UI | list-view | data-display
// why: Displays all content nodes in tabular format with status visibility for library browsing and quick navigation
// in:[/api/content-endpoint] out:[JSX-table-ui] err:[fetch-failure]
// hazard: No error state UI; fetch failures silently leave spinner indefinitely
// hazard: Row click uses window.location.href instead of router.push, breaks client-side routing
// hazard: StatusBadge component imported but signature/props not validated
// edge:../../components/content/status-badge.tsx -> USES
// edge:../[id]/page.tsx -> NAVIGATES-TO
// prompt: Add error boundary or error state UI; replace window.location.href with Next.js router; validate StatusBadge props

'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/content/status-badge';
import type { ContentNode } from '@/domain';

export default function ContentListPage() {
  const [nodes, setNodes] = useState<ContentNode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/content');
        const data = await res.json();
        setNodes(data.nodes ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        console.error('Failed to load content:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="font-button text-primary">LIBRARY</span>
          <span className="font-small text-muted">{total} NODES</span>
        </div>
        <a
          href="/content/new"
          className="border border-primary text-primary font-button text-xs px-3 py-1 hover:bg-primary hover:text-background transition-colors"
        >
          + NEW
        </a>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 font-small text-muted">[DATA STREAM INCOMING]</div>
        ) : nodes.length === 0 ? (
          <div className="p-4 font-small text-muted">0 RESULTS FOUND</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 font-small text-muted uppercase">TITLE</th>
                <th className="text-left px-4 py-2 font-small text-muted uppercase">TYPE</th>
                <th className="text-left px-4 py-2 font-small text-muted uppercase">STATUS</th>
                <th className="text-right px-4 py-2 font-small text-muted uppercase">WORDS</th>
                <th className="text-right px-4 py-2 font-small text-muted uppercase">CREATED</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr
                  key={node.id}
                  className="border-b border-border hover:bg-surface transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/content/${node.id}`}
                >
                  <td className="px-4 py-2 text-foreground">{node.title}</td>
                  <td className="px-4 py-2">
                    <span className="font-button text-xs text-muted">
                      {node.contentType.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={node.status} />
                  </td>
                  <td className="px-4 py-2 text-right font-data text-muted">
                    {node.wordCount ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-small text-muted">
                    {new Date(node.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
