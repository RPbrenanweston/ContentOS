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
