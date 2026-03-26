import { createClient } from '@/lib/supabase/server';
import type { ContentNode } from '@/domain';
import Link from 'next/link';

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: ContentNode[] = [];
  if (user) {
    const { data } = await supabase
      .from('content_nodes')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(50);
    items = data ?? [];
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Content</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/content/new"
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: 'var(--primary, #3b82f6)',
            color: '#fff',
          }}
        >
          New content
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <ContentTable items={items} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-20 text-center"
      style={{ borderColor: 'var(--border)' }}
    >
      <p className="text-sm font-medium mb-1">No content yet</p>
      <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
        Create your first blog post, video, or podcast episode.
      </p>
      <Link
        href="/content/new"
        className="px-4 py-2 rounded-md text-sm font-medium"
        style={{ background: 'var(--primary, #3b82f6)', color: '#fff' }}
      >
        Create content
      </Link>
    </div>
  );
}

function ContentTable({ items }: { items: ContentNode[] }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--muted, #f8f9fa)' }}>
          <tr>
            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Title
            </th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell" style={{ color: 'var(--muted-foreground)' }}>
              Type
            </th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell" style={{ color: 'var(--muted-foreground)' }}>
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell" style={{ color: 'var(--muted-foreground)' }}>
              Updated
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.id}
              style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}
              className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/content/${item.id}`}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--foreground)' }}
                >
                  {item.title}
                </Link>
                {item.description && (
                  <p
                    className="text-xs mt-0.5 line-clamp-1"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {item.description}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <TypeBadge type={item.content_type} />
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <StatusBadge status={item.status} />
              </td>
              <td
                className="px-4 py-3 hidden md:table-cell text-xs"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {new Date(item.updated_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/content/${item.id}`}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  blog: 'Blog',
  video: 'Video',
  audio: 'Audio',
  podcast_episode: 'Episode',
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#f1f5f9', color: '#64748b' },
  processing: { bg: '#fef3c7', color: '#92400e' },
  ready: { bg: '#dcfce7', color: '#166534' },
  published: { bg: '#dbeafe', color: '#1e40af' },
  archived: { bg: '#f1f5f9', color: '#9ca3af' },
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: '#f1f5f9', color: '#475569' }}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: '#f1f5f9', color: '#6b7280' };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: style.bg, color: style.color }}
    >
      {status}
    </span>
  );
}
