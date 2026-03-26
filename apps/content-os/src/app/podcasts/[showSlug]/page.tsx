import { createClient } from '@/lib/supabase/server';
import type { PodcastShow, ContentNode } from '@/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ShowDashboardPage({
  params,
}: {
  params: Promise<{ showSlug: string }>;
}) {
  const { showSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return notFound();
  }

  // Look up show by slug
  const { data: show } = await supabase
    .from('podcast_shows')
    .select('*')
    .eq('slug', showSlug)
    .eq('user_id', user.id)
    .single();

  if (!show) {
    return notFound();
  }

  const typedShow = show as PodcastShow;

  // Fetch episodes
  const { data: episodesRaw } = await supabase
    .from('content_nodes')
    .select('*')
    .eq('show_id', typedShow.id)
    .eq('content_type', 'podcast_episode')
    .order('episode_number', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const episodes: ContentNode[] = episodesRaw ?? [];

  // Compute stats
  const totalDuration = episodes.reduce(
    (sum, ep) => sum + (ep.media_duration_seconds ?? 0),
    0,
  );
  const durationMinutes = Math.round(totalDuration / 60);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Show header */}
      <div className="flex gap-6 mb-8">
        {typedShow.artwork_url ? (
          <div
            className="w-28 h-28 rounded-lg bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url(${typedShow.artwork_url})` }}
          />
        ) : (
          <div
            className="w-28 h-28 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#CBFF53' }}
          >
            <span className="text-4xl">🎙</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold">{typedShow.title}</h1>
              <p
                className="text-sm mt-1 line-clamp-2"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {typedShow.description}
              </p>
            </div>
            <Link
              href={`/podcasts/${showSlug}/edit`}
              className="px-3 py-1.5 rounded-md text-xs font-medium shrink-0"
              style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              Edit show
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-4">
            <Stat label="Episodes" value={String(episodes.length)} />
            <Stat label="Total duration" value={`${durationMinutes} min`} />
            <Stat label="Subscribers" value="--" />
          </div>
        </div>
      </div>

      {/* Episode section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Episodes</h2>
        <Link
          href={`/podcasts/${showSlug}/episodes/new`}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ background: '#CBFF53', color: '#1a1a1a' }}
        >
          New episode
        </Link>
      </div>

      {episodes.length === 0 ? (
        <div
          className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-16 text-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-medium mb-1">No episodes yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
            Upload your first episode to get started.
          </p>
          <Link
            href={`/podcasts/${showSlug}/episodes/new`}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ background: '#CBFF53', color: '#1a1a1a' }}
          >
            Upload episode
          </Link>
        </div>
      ) : (
        <EpisodeTable episodes={episodes} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </p>
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#f1f5f9', color: '#64748b' },
  processing: { bg: '#fef3c7', color: '#92400e' },
  ready: { bg: '#dcfce7', color: '#166534' },
  published: { bg: '#dbeafe', color: '#1e40af' },
  archived: { bg: '#f1f5f9', color: '#9ca3af' },
};

function EpisodeTable({ episodes }: { episodes: ContentNode[] }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--muted, #f8f9fa)' }}>
          <tr>
            <th
              className="text-left px-4 py-3 font-medium w-12"
              style={{ color: 'var(--muted-foreground)' }}
            >
              #
            </th>
            <th
              className="text-left px-4 py-3 font-medium"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Title
            </th>
            <th
              className="text-left px-4 py-3 font-medium hidden md:table-cell"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Status
            </th>
            <th
              className="text-left px-4 py-3 font-medium hidden md:table-cell"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((ep, i) => {
            const statusStyle = STATUS_STYLES[ep.status] ?? {
              bg: '#f1f5f9',
              color: '#6b7280',
            };
            return (
              <tr
                key={ep.id}
                style={{
                  borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                }}
                className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <td
                  className="px-4 py-3 tabular-nums"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {ep.episode_number ?? '--'}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{ep.title}</p>
                  {ep.description && (
                    <p
                      className="text-xs mt-0.5 line-clamp-1"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {ep.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: statusStyle.bg,
                      color: statusStyle.color,
                    }}
                  >
                    {ep.status}
                  </span>
                </td>
                <td
                  className="px-4 py-3 hidden md:table-cell text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {new Date(ep.created_at).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
