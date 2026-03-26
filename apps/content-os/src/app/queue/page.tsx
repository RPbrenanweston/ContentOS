import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────

interface DistributionJob {
  id: string;
  status: 'pending' | 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';
  scheduled_at: string | null;
  published_at: string | null;
  error_message: string | null;
  platform_post_url: string | null;
  retry_count: number;
  content_snapshot: Record<string, unknown>;
  distribution_accounts: {
    platform: string;
    platform_display_name: string | null;
    platform_username: string | null;
  } | null;
  content_nodes: {
    id: string;
    title: string | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: 'rgba(234, 179, 8, 0.1)',   color: '#ca8a04', label: 'Pending' },
  scheduled:  { bg: 'rgba(59, 130, 246, 0.1)',  color: '#3b82f6', label: 'Scheduled' },
  processing: { bg: 'rgba(139, 92, 246, 0.1)',  color: '#8b5cf6', label: 'Processing' },
  published:  { bg: 'rgba(16, 185, 129, 0.1)',  color: '#10b981', label: 'Published' },
  failed:     { bg: 'rgba(239, 68, 68, 0.1)',   color: '#ef4444', label: 'Failed' },
  cancelled:  { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: 'Cancelled' },
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  threads: 'Threads',
  bluesky: 'Bluesky',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Page ─────────────────────────────────────────────────

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const params = await searchParams;
  const statusFilter = typeof params.status === 'string' ? params.status : null;

  let jobs: DistributionJob[] = [];

  if (user) {
    let query = supabase
      .from('distribution_jobs')
      .select(`
        id, status, scheduled_at, published_at, error_message,
        platform_post_url, retry_count, content_snapshot,
        distribution_accounts ( platform, platform_display_name, platform_username ),
        content_nodes ( id, title )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    jobs = (data ?? []) as unknown as DistributionJob[];
  }

  const tabs: { value: string | null; label: string }[] = [
    { value: null, label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'pending', label: 'Pending' },
    { value: 'published', label: 'Published' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="h-14 flex items-center justify-between px-6 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Queue
          </h1>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Link
          href="/content/new"
          className="px-4 py-1.5 rounded-md text-xs font-semibold"
          style={{ background: '#CBFF53', color: '#000' }}
        >
          New post
        </Link>
      </div>

      {/* Status filter tabs */}
      <div
        className="flex items-center gap-1 px-6 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {tabs.map((tab) => {
          const active = statusFilter === tab.value;
          return (
            <Link
              key={tab.value ?? 'all'}
              href={tab.value ? `/queue?status=${tab.value}` : '/queue'}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: active ? 'var(--foreground)' : 'transparent',
                color: active ? 'var(--background)' : 'var(--muted-foreground)',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              No distribution jobs
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
              Publish a piece of content to see it appear here.
            </p>
            <Link
              href="/content/new"
              className="px-4 py-2 rounded-md text-sm font-semibold"
              style={{ background: '#CBFF53', color: '#000' }}
            >
              Create content
            </Link>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-6 px-6 space-y-2">
            {jobs.map((job) => {
              const style = STATUS_STYLE[job.status] ?? STATUS_STYLE.pending;
              const account = job.distribution_accounts;
              const node = job.content_nodes;
              const platformLabel = account
                ? PLATFORM_LABELS[account.platform] ?? account.platform
                : 'Unknown platform';
              const accountHandle = account?.platform_display_name ?? account?.platform_username;
              const contentTitle =
                (node?.title) ??
                (job.content_snapshot?.title as string | undefined) ??
                'Untitled';

              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ border: '1px solid var(--card-border)', background: 'var(--card)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {platformLabel}
                        {accountHandle ? ` · ${accountHandle}` : ''}
                      </span>
                    </div>
                    {node?.id ? (
                      <Link
                        href={`/content/${node.id}`}
                        className="text-sm font-medium truncate block hover:underline"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {contentTitle}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {contentTitle}
                      </p>
                    )}
                    {job.error_message && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#ef4444' }}>
                        {job.error_message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {job.status === 'published'
                          ? formatDate(job.published_at)
                          : formatDate(job.scheduled_at)}
                      </p>
                      {job.retry_count > 0 && (
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {job.retry_count} retr{job.retry_count === 1 ? 'y' : 'ies'}
                        </p>
                      )}
                    </div>
                    {job.platform_post_url && (
                      <a
                        href={job.platform_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                      >
                        View post ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
