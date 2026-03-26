import type { PodcastShow, ContentNode, Chapter } from '@/domain';

// ─── Public API ────────────────────────────────────────────

export interface FeedOptions {
  show: PodcastShow;
  episodes: ContentNode[];
  baseUrl: string;
}

export function generateFeed(options: FeedOptions): string {
  const { show, episodes, baseUrl } = options;
  const feedUrl = `${baseUrl}/api/podcast/feed/${encodeURIComponent(show.slug)}`;

  const channelXml = [
    `    <title>${escapeXml(show.title)}</title>`,
    `    <link>${escapeXml(show.website_url ?? baseUrl)}</link>`,
    `    <description>${escapeXml(show.description)}</description>`,
    `    <language>${escapeXml(show.language)}</language>`,
    `    <copyright>${escapeXml(show.copyright ?? `\u00A9 ${new Date().getFullYear()} ${show.author}`)}</copyright>`,
    `    <lastBuildDate>${toRFC2822(new Date().toISOString())}</lastBuildDate>`,
    `    <generator>Content OS</generator>`,
    ``,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    ``,
    `    <itunes:author>${escapeXml(show.author)}</itunes:author>`,
    `    <itunes:summary>${escapeXml(show.description)}</itunes:summary>`,
    `    <itunes:explicit>${show.explicit ? 'true' : 'false'}</itunes:explicit>`,
    `    <itunes:category text="${escapeXml(show.category)}"${show.subcategory ? `>\n      <itunes:category text="${escapeXml(show.subcategory)}"/>\n    </itunes:category` : '/'}>`,
    `    <itunes:owner>`,
    `      <itunes:name>${escapeXml(show.owner_name)}</itunes:name>`,
    `      <itunes:email>${escapeXml(show.owner_email)}</itunes:email>`,
    `    </itunes:owner>`,
    `    <itunes:image href="${escapeXml(show.artwork_url)}"/>`,
    `    <itunes:type>${show.show_type === 'serial' ? 'serial' : 'episodic'}</itunes:type>`,
  ];

  const itemsXml = episodes.map((ep) => generateEpisodeItem(ep, show, baseUrl));

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0"`,
    `  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"`,
    `  xmlns:podcast="https://podcastindex.org/namespace/1.0"`,
    `  xmlns:atom="http://www.w3.org/2005/Atom"`,
    `  xmlns:content="http://purl.org/rss/1.0/modules/content/">`,
    `  <channel>`,
    ...channelXml,
    ``,
    ...itemsXml,
    `  </channel>`,
    `</rss>`,
  ].join('\n');
}

// ─── Episode Item ──────────────────────────────────────────

function generateEpisodeItem(
  episode: ContentNode,
  show: PodcastShow,
  baseUrl: string,
): string {
  const pubDate = toRFC2822(episode.published_at ?? episode.created_at);
  const episodeLink = `${baseUrl}/p/${encodeURIComponent(show.slug)}/${encodeURIComponent(episode.slug ?? episode.id)}`;
  const duration = formatDuration(episode.media_duration_seconds);

  const lines: string[] = [
    `    <item>`,
    `      <title>${escapeXml(episode.title)}</title>`,
    `      <description>${escapeXml(episode.description ?? '')}</description>`,
    `      <content:encoded><![CDATA[${episode.show_notes ?? episode.description ?? ''}]]></content:encoded>`,
    `      <link>${escapeXml(episodeLink)}</link>`,
    `      <guid isPermaLink="false">${escapeXml(episode.id)}</guid>`,
    `      <pubDate>${pubDate}</pubDate>`,
    ``,
    `      <enclosure url="${escapeXml(episode.media_url ?? '')}" length="${episode.media_size_bytes ?? 0}" type="${getMimeType(episode.media_url)}"/>`,
    ``,
    `      <itunes:title>${escapeXml(episode.title)}</itunes:title>`,
    `      <itunes:author>${escapeXml(show.author)}</itunes:author>`,
    `      <itunes:summary>${escapeXml(episode.description ?? '')}</itunes:summary>`,
    `      <itunes:explicit>${episode.explicit ? 'true' : 'false'}</itunes:explicit>`,
  ];

  if (duration) {
    lines.push(`      <itunes:duration>${duration}</itunes:duration>`);
  }

  if (episode.episode_number != null) {
    lines.push(`      <itunes:episode>${episode.episode_number}</itunes:episode>`);
  }

  if (episode.season_number != null) {
    lines.push(`      <itunes:season>${episode.season_number}</itunes:season>`);
  }

  lines.push(`      <itunes:episodeType>${escapeXml(episode.episode_type ?? 'full')}</itunes:episodeType>`);

  if (episode.thumbnail_url) {
    lines.push(`      <itunes:image href="${escapeXml(episode.thumbnail_url)}"/>`);
  }

  if (episode.chapters?.length) {
    lines.push(generateChaptersTag(episode, baseUrl));
  }

  if (episode.transcript) {
    lines.push(
      `      <podcast:transcript url="${escapeXml(`${baseUrl}/api/podcast/episodes/${episode.id}/transcript`)}" type="application/json"/>`,
    );
  }

  lines.push(`    </item>`);

  return lines.join('\n');
}

// ─── Helpers ───────────────────────────────────────────────

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return '';
  const totalSeconds = Math.round(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function getMimeType(url: string | null): string {
  if (!url) return 'audio/mpeg';
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    opus: 'audio/opus',
  };
  return (ext && mimeMap[ext]) ?? 'audio/mpeg';
}

export function toRFC2822(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  // Date.prototype.toUTCString() produces RFC 7231 format which is
  // compatible with RFC 2822 for RSS purposes.
  return d.toUTCString();
}

function generateChaptersTag(episode: ContentNode, baseUrl: string): string {
  return `      <podcast:chapters url="${escapeXml(`${baseUrl}/api/podcast/episodes/${episode.id}/chapters`)}" type="application/json+chapters"/>`;
}
