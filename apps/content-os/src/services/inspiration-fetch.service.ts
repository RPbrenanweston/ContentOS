/**
 * Inspiration fetch service.
 *
 * Given a URL (and optional hinted source type), fetch the underlying content
 * and normalize it to a FetchResult. Uses a strategy pattern: one private
 * method per source type.
 *
 * Sources:
 *   - article / substack / linkedin / generic -> Jina Reader (r.jina.ai)
 *   - tweet -> Twitter oEmbed (fallback to Jina Reader)
 *   - youtube -> youtube-transcript + YouTube oEmbed
 *   - pdf -> minimal stub (Phase 2 will parse)
 *   - image -> minimal stub
 */

import type { InspirationSourceType } from '@/domain';
import type {
  FetchResult,
  IInspirationFetchService,
} from './interfaces/inspiration';

const JINA_READER_BASE = 'https://r.jina.ai/';
const TWITTER_OEMBED = 'https://publish.twitter.com/oembed';
const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed';

export class InspirationFetchServiceImpl implements IInspirationFetchService {
  async fetch(
    url: string,
    hintedType?: InspirationSourceType,
  ): Promise<FetchResult> {
    const sourceType = hintedType ?? this.detectSourceType(url);

    switch (sourceType) {
      case 'tweet':
        return this.fetchTweet(url);
      case 'youtube':
        return this.fetchYouTube(url);
      case 'pdf':
        return this.fetchPdf(url);
      case 'image':
        return this.fetchImage(url);
      case 'substack':
      case 'linkedin':
      case 'article':
      default:
        return this.fetchViaJina(url, sourceType);
    }
  }

  /** Detect source type from URL shape. */
  private detectSourceType(url: string): InspirationSourceType {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return 'article';
    }

    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
      return 'tweet';
    }
    if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      return 'youtube';
    }
    if (host.endsWith('.substack.com') || host === 'substack.com') {
      return 'substack';
    }
    if (host === 'linkedin.com' || host === 'www.linkedin.com') {
      if (pathname.startsWith('/posts') || pathname.startsWith('/pulse')) {
        return 'linkedin';
      }
    }
    if (pathname.endsWith('.pdf')) {
      return 'pdf';
    }
    if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(pathname)) {
      return 'image';
    }

    return 'article';
  }

  /** Fetch via Jina Reader — works for most article-like URLs. */
  private async fetchViaJina(
    url: string,
    sourceType: InspirationSourceType,
  ): Promise<FetchResult> {
    const endpoint = `${JINA_READER_BASE}${encodeURIComponent(url)}`;

    const res = await fetch(endpoint, {
      headers: {
        Accept: 'text/markdown',
        'X-With-Generated-Alt': 'true',
      },
    });

    if (!res.ok) {
      throw new Error(
        `Jina Reader failed for ${url}: ${res.status} ${res.statusText}`,
      );
    }

    const markdown = await res.text();
    const parsed = parseJinaPreamble(markdown);

    return {
      sourceType,
      title: parsed.title,
      author: parsed.author,
      publishedAt: parsed.publishedAt,
      bodyMarkdown: parsed.body,
      raw: { provider: 'jina', endpoint, preamble: parsed.preamble },
    };
  }

  /** Fetch a tweet via Twitter oEmbed; fallback to Jina Reader on failure. */
  private async fetchTweet(url: string): Promise<FetchResult> {
    const endpoint = `${TWITTER_OEMBED}?url=${encodeURIComponent(url)}&omit_script=1`;

    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Twitter oEmbed ${res.status}`);

      const json = (await res.json()) as {
        author_name?: string;
        author_url?: string;
        html?: string;
        url?: string;
      };

      const handle = json.author_url
        ? json.author_url.split('/').filter(Boolean).pop()
        : undefined;

      // Strip HTML to a rough markdown body from the embed
      const bodyMarkdown = json.html
        ? htmlToPlainText(json.html)
        : undefined;

      return {
        sourceType: 'tweet',
        title: bodyMarkdown ? bodyMarkdown.slice(0, 80) : undefined,
        author: json.author_name,
        authorHandle: handle,
        bodyMarkdown,
        bodyHtml: json.html,
        raw: { provider: 'twitter-oembed', ...json },
      };
    } catch {
      // Fallback to Jina
      return this.fetchViaJina(url, 'tweet');
    }
  }

  /** Fetch a YouTube video: oEmbed metadata + transcript via youtube-transcript. */
  private async fetchYouTube(url: string): Promise<FetchResult> {
    // oEmbed for metadata
    let meta: Record<string, unknown> = {};
    try {
      const oembedRes = await fetch(
        `${YOUTUBE_OEMBED}?url=${encodeURIComponent(url)}&format=json`,
      );
      if (oembedRes.ok) {
        meta = (await oembedRes.json()) as Record<string, unknown>;
      }
    } catch {
      // non-fatal
    }

    // Transcript
    let transcriptText = '';
    let transcriptRaw: unknown = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = await import('youtube-transcript');
      const YoutubeTranscript = (mod as { YoutubeTranscript?: { fetchTranscript(u: string): Promise<Array<{ text: string }>> } }).YoutubeTranscript
        ?? (mod as unknown as { default?: { fetchTranscript(u: string): Promise<Array<{ text: string }>> } }).default;

      if (YoutubeTranscript && typeof YoutubeTranscript.fetchTranscript === 'function') {
        const segments = await YoutubeTranscript.fetchTranscript(url);
        transcriptRaw = segments;
        transcriptText = segments
          .map((s) => s.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch (err) {
      // Transcript fetch can fail (no captions, age-restricted, etc.) — non-fatal
      transcriptRaw = { error: err instanceof Error ? err.message : String(err) };
    }

    const title =
      typeof meta.title === 'string' ? (meta.title as string) : undefined;
    const author =
      typeof meta.author_name === 'string'
        ? (meta.author_name as string)
        : undefined;
    const mediaUrl =
      typeof meta.thumbnail_url === 'string'
        ? (meta.thumbnail_url as string)
        : undefined;

    return {
      sourceType: 'youtube',
      title,
      author,
      mediaUrl,
      bodyMarkdown: transcriptText || undefined,
      raw: { provider: 'youtube', oembed: meta, transcript: transcriptRaw },
    };
  }

  /** PDF: Phase 1 stub — full parsing is Phase 2 polish. */
  private async fetchPdf(url: string): Promise<FetchResult> {
    return {
      sourceType: 'pdf',
      title: url,
      mediaUrl: url,
      raw: { provider: 'stub', note: 'PDF parsing deferred to Phase 2' },
    };
  }

  /** Image: minimal — just record the media URL. */
  private async fetchImage(url: string): Promise<FetchResult> {
    return {
      sourceType: 'image',
      mediaUrl: url,
      raw: { provider: 'stub' },
    };
  }
}

/**
 * Jina Reader returns markdown prefixed with a preamble like:
 *   Title: Some article
 *   URL Source: https://...
 *   Published Time: 2024-01-02T...
 *   Markdown Content:
 *   # Some article
 *   ...
 *
 * Parse pragmatically. Fall back gracefully if the preamble is missing.
 */
function parseJinaPreamble(raw: string): {
  title?: string;
  author?: string;
  publishedAt?: Date;
  body: string;
  preamble: Record<string, string>;
} {
  const preamble: Record<string, string> = {};
  const lines = raw.split('\n');

  let cursor = 0;
  const preambleKeyPattern = /^([A-Z][A-Za-z ]{1,40}):\s*(.*)$/;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line.trim() === '') {
      cursor++;
      continue;
    }
    const m = preambleKeyPattern.exec(line);
    if (!m) break;
    const key = m[1].trim();
    const value = m[2].trim();
    preamble[key] = value;
    cursor++;
    // Stop at the "Markdown Content:" marker (body comes right after)
    if (/^markdown content$/i.test(key)) break;
  }

  // Body = everything after the preamble
  const body = lines.slice(cursor).join('\n').trim();

  let title: string | undefined = preamble['Title'];
  if (!title) {
    const h1 = body.match(/^#\s+(.+)$/m);
    if (h1) title = h1[1].trim();
  }

  const author = preamble['Author'] ?? preamble['Byline'];

  let publishedAt: Date | undefined;
  const rawDate =
    preamble['Published Time'] ??
    preamble['Published'] ??
    preamble['Date'];
  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) publishedAt = d;
  }

  return { title, author, publishedAt, body: body || raw, preamble };
}

/** Cheap HTML -> text stripper for tweet embed HTML. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
