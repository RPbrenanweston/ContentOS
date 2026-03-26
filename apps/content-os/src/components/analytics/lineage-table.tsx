// @crumb lineage-table
// UI | Content lineage | Asset tracking | Distribution analytics
// why: Master table showing content source nodes with derived assets and distribution job counts, clickable to drill-down
// in:[rows: LineageRow[] (node+assets+jobs)] out:[HTML table with job status counts] err:[empty rows, missing row.node.id]
// hazard: Click handler uses window.location.href—no loading state, user may click twice and trigger duplicate navigation
// hazard: Job counts computed inline (filter on each render)—inefficient if hundreds of jobs; no memoization
// edge:./asset-card.tsx -> RELATES [assets in row displayed as card list elsewhere]
// edge:./status-badge.tsx -> CALLS [renders row node status badge]
// edge:../../domain/content-node.ts -> READS [ContentNode type]
// edge:../../domain/derived-asset.ts -> READS [DerivedAsset type]
// edge:../../domain/distribution.ts -> READS [DistributionJob type]
// prompt: Disable click during navigation. Memoize job count filters. Add keyboard navigation (Enter to drill down).

'use client';

import { StatusBadge } from '@/components/content/status-badge';
import type { ContentNode, DerivedAsset, DistributionJob } from '@/domain';

interface LineageRow {
  node: ContentNode;
  assets: DerivedAsset[];
  jobs: DistributionJob[];
}

interface LineageTableProps {
  rows: LineageRow[];
}

export function LineageTable({ rows }: LineageTableProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left px-4 py-2 font-small text-muted uppercase">SOURCE</th>
          <th className="text-left px-4 py-2 font-small text-muted uppercase">TYPE</th>
          <th className="text-left px-4 py-2 font-small text-muted uppercase">STATUS</th>
          <th className="text-right px-4 py-2 font-small text-muted uppercase">ASSETS</th>
          <th className="text-right px-4 py-2 font-small text-muted uppercase">PUBLISHED</th>
          <th className="text-right px-4 py-2 font-small text-muted uppercase">FAILED</th>
          <th className="text-right px-4 py-2 font-small text-muted uppercase">CREATED</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const publishedJobs = row.jobs.filter((j) => j.status === 'published').length;
          const failedJobs = row.jobs.filter((j) => j.status === 'failed').length;
          return (
            <tr
              key={row.node.id}
              className="border-b border-border hover:bg-surface transition-colors cursor-pointer"
              onClick={() => (window.location.href = `/content/${row.node.id}`)}
            >
              <td className="px-4 py-2 text-foreground">{row.node.title}</td>
              <td className="px-4 py-2">
                <span className="font-button text-xs text-muted">
                  {row.node.contentType.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-2">
                <StatusBadge status={row.node.status} />
              </td>
              <td className="px-4 py-2 text-right font-data text-muted">
                {row.assets.length}
              </td>
              <td className="px-4 py-2 text-right font-data text-primary">
                {publishedJobs || '—'}
              </td>
              <td className="px-4 py-2 text-right font-data text-accent">
                {failedJobs || '—'}
              </td>
              <td className="px-4 py-2 text-right font-small text-muted">
                {new Date(row.node.createdAt).toLocaleDateString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
