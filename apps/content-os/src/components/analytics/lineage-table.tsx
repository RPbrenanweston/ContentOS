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
