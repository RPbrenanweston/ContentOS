// @crumb status-badge
// UI | Status indicator | Visual state | Utility component
// why: Reusable badge component for displaying workflow status across content, assets, and jobs with consistent styling
// in:[status: AnyStatus string] out:[styled span element] err:[unknown status type, null status]
// hazard: Unknown status values fallback to muted style silently—critical statuses like 'error' could be visually de-prioritized
// hazard: Animated statuses use CSS animate-pulse—no performance consideration for high-frequency rerenders in lists
// edge:./asset-card.tsx -> CALLS [renders asset.status badge]
// edge:./publish-panel.tsx -> CALLS [renders job.status in history]
// edge:../analytics/lineage-table.tsx -> CALLS [renders node.status in table rows]
// edge:../../domain/enums.ts -> READS [ContentNodeStatus, AssetStatus, JobStatus types]
// prompt: Warn on unknown status values to console. Consider reduced motion media query for animations.

import type { ContentNodeStatus, AssetStatus, JobStatus } from '@/domain';

type AnyStatus = ContentNodeStatus | AssetStatus | JobStatus;

const statusStyles: Record<string, string> = {
  draft: 'text-muted border-muted',
  processing: 'text-primary border-primary animate-pulse',
  generating: 'text-primary border-primary animate-pulse',
  ready: 'text-primary border-primary',
  approved: 'text-primary border-primary',
  published: 'text-primary border-primary',
  failed: 'text-accent border-accent',
  archived: 'text-muted border-muted',
  pending: 'text-muted border-muted',
  scheduled: 'text-foreground border-foreground',
  publishing: 'text-primary border-primary animate-pulse',
  cancelled: 'text-muted border-muted',
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const style = statusStyles[status] ?? 'text-muted border-muted';
  return (
    <span className={`inline-block px-2 py-0.5 border font-button text-[10px] ${style}`}>
      {status.toUpperCase()}
    </span>
  );
}
