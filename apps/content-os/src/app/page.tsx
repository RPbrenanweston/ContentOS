import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// ─── Dashboard Page ────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Stats
  let draftCount = 0;
  let publishedCount = 0;
  let channelCount = 0;
  let jobsThisWeek = 0;
  let recentDrafts: { id: string; title: string | null; content_type: string; updated_at: string }[] = [];

  if (user) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [draftsRes, publishedRes, channelsRes, jobsRes, recentRes] = await Promise.all([
      supabase.from('content_nodes').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'draft'),
      supabase.from('content_nodes').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'published'),
      supabase.from('distribution_accounts').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_active', true),
      supabase.from('distribution_jobs').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'published').gte('published_at', weekAgo),
      supabase.from('content_nodes').select('id, title, content_type, updated_at')
        .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
    ]);

    draftCount     = draftsRes.count ?? 0;
    publishedCount = publishedRes.count ?? 0;
    channelCount   = channelsRes.count ?? 0;
    jobsThisWeek   = jobsRes.count ?? 0;
    recentDrafts   = (recentRes.data ?? []) as typeof recentDrafts;
  }

  const stats = [
    { label: 'Drafts',      value: draftCount,     href: '/drafts',   color: 'var(--foreground)' },
    { label: 'Published',   value: publishedCount, href: '/queue',    color: '#10b981' },
    { label: 'Channels',    value: channelCount,   href: '/accounts', color: '#3b82f6' },
    { label: 'Posts (7d)',  value: jobsThisWeek,   href: '/queue?status=published', color: '#8b5cf6' },
  ];

  const TYPE_LABELS: Record<string, string> = {
    blog: 'Blog', image: 'Image', video: 'Video',
    audio: 'Audio', podcast_episode: 'Episode',
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-10">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Good {getTimeOfDay()}{user ? `, ${user.email?.split('@')[0]}` : ''}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Write once, reach everywhere.
          </p>
        </div>

        {/* Quick action */}
        <Link
          href="/content/new"
          className="flex items-center gap-3 w-full px-5 py-3.5 rounded-xl mb-8 transition-opacity hover:opacity-90"
          style={{ background: '#CBFF53', color: '#000' }}
        >
          <span className="text-lg">✏️</span>
          <div>
            <p className="text-sm font-semibold">Start writing</p>
            <p className="text-xs opacity-60">New blog post, video script, or podcast script</p>
          </div>
          <span className="ml-auto text-lg opacity-60">→</span>
        </Link>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-xl p-4 transition-opacity hover:opacity-80"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {stat.label}
              </p>
            </Link>
          ))}
        </div>

        {/* Recent content */}
        {recentDrafts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Recent
              </h2>
              <Link href="/drafts" className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                View all →
              </Link>
            </div>
            <div className="space-y-1.5">
              {recentDrafts.map((node) => (
                <Link
                  key={node.id}
                  href={`/content/${node.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-lg transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {node.title || <span style={{ color: 'var(--muted-foreground)' }}>Untitled</span>}
                  </p>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: '#f1f5f9', color: '#475569' }}
                    >
                      {TYPE_LABELS[node.content_type] ?? node.content_type}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {formatRelative(node.updated_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!user && (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Connect your Supabase project
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Add real credentials to <code className="font-mono">.env.local</code> to enable auth and data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
