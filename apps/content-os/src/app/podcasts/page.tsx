import { createClient } from '@/lib/supabase/server';
import type { PodcastShow } from '@/domain';
import Link from 'next/link';

export default async function PodcastsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shows: PodcastShow[] = [];
  if (user) {
    const { data } = await supabase
      .from('podcast_shows')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    shows = data ?? [];
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Podcasts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {shows.length} show{shows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/podcasts/new"
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ background: '#CBFF53', color: '#1a1a1a' }}
        >
          New show
        </Link>
      </div>

      {shows.length === 0 ? (
        <EmptyState />
      ) : (
        <ShowGrid shows={shows} />
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
      <p className="text-sm font-medium mb-1">No podcast shows yet</p>
      <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
        Create your first show to start publishing episodes.
      </p>
      <Link
        href="/podcasts/new"
        className="px-4 py-2 rounded-md text-sm font-medium"
        style={{ background: '#CBFF53', color: '#1a1a1a' }}
      >
        Create show
      </Link>
    </div>
  );
}

function ShowGrid({ shows }: { shows: PodcastShow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shows.map((show) => (
        <Link
          key={show.id}
          href={`/podcasts/${show.slug}`}
          className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
          style={{ border: '1px solid var(--border)' }}
        >
          {show.artwork_url ? (
            <div
              className="w-full aspect-square bg-cover bg-center"
              style={{ backgroundImage: `url(${show.artwork_url})` }}
            />
          ) : (
            <div
              className="w-full aspect-square flex items-center justify-center"
              style={{ background: '#CBFF53' }}
            >
              <span className="text-4xl">🎙</span>
            </div>
          )}
          <div className="p-4">
            <h2 className="font-medium text-sm truncate">{show.title}</h2>
            <p
              className="text-xs mt-1 line-clamp-2"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {show.description}
            </p>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {show.category} &middot; {show.language}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
