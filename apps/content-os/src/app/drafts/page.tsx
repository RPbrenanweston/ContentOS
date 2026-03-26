import { createClient } from '@/lib/supabase/server';
import type { ContentNode } from '@/domain';
import Link from 'next/link';

export default async function DraftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let drafts: ContentNode[] = [];
  if (user) {
    const { data } = await supabase
      .from('content_nodes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(50);
    drafts = data ?? [];
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Drafts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/content/new"
          className="px-4 py-2 rounded-md text-sm font-medium"
          style={{ background: 'var(--primary, #3b82f6)', color: '#fff' }}
        >
          New draft
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div
          className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-medium mb-1">No drafts</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
            Start writing — your work auto-saves as you go.
          </p>
          <Link
            href="/content/new"
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ background: 'var(--primary, #3b82f6)', color: '#fff' }}
          >
            Create draft
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftCard({ draft }: { draft: ContentNode }) {
  const updated = new Date(draft.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relativeTime: string;
  if (diffMins < 1) relativeTime = 'just now';
  else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
  else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
  else relativeTime = `${diffDays}d ago`;

  const TYPE_LABELS: Record<string, string> = {
    blog: 'Blog',
    video: 'Video',
    audio: 'Audio',
    podcast_episode: 'Episode',
  };

  return (
    <Link
      href={`/content/${draft.id}`}
      className="flex items-start justify-between p-4 rounded-lg transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
          {draft.title || <span style={{ color: 'var(--muted-foreground)' }}>Untitled</span>}
        </p>
        {draft.description && (
          <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
            {draft.description}
          </p>
        )}
      </div>
      <div
        className="flex items-center gap-3 ml-4 shrink-0 text-xs"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <span
          className="px-2 py-0.5 rounded"
          style={{ background: '#f1f5f9', color: '#475569' }}
        >
          {TYPE_LABELS[draft.content_type] ?? draft.content_type}
        </span>
        <span>{relativeTime}</span>
      </div>
    </Link>
  );
}
