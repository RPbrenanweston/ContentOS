import type { PlatformType } from '@/domain';
import type { PlatformAdapter } from './types';
import { TwitterAdapter } from './twitter/adapter';
import { LinkedInAdapter } from './linkedin/adapter';

/**
 * Platform adapter factory.
 * Instantiates the correct adapter with credentials from environment variables.
 *
 * Currently supported:
 *   - twitter: TwitterAdapter (requires TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, TWITTER_REDIRECT_URI)
 *   - linkedin: LinkedInAdapter (requires LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI)
 *
 * TODO: Add adapters for youtube, instagram, facebook, threads,
 *       tiktok, bluesky, reddit, medium, substack, ghost, beehiiv
 */
export function getAdapter(platform: PlatformType): PlatformAdapter {
  switch (platform) {
    case 'twitter':
      return new TwitterAdapter();

    case 'linkedin':
      return new LinkedInAdapter();

    // TODO: case 'youtube': return new YouTubeAdapter();
    // TODO: case 'instagram': return new InstagramAdapter();
    // TODO: case 'facebook': return new FacebookAdapter();
    // TODO: case 'threads': return new ThreadsAdapter();
    // TODO: case 'tiktok': return new TikTokAdapter();
    // TODO: case 'bluesky': return new BlueskyAdapter();
    // TODO: case 'reddit': return new RedditAdapter();
    // TODO: case 'medium': return new MediumAdapter();
    // TODO: case 'substack': return new SubstackAdapter();
    // TODO: case 'ghost': return new GhostAdapter();
    // TODO: case 'beehiiv': return new BeehiivAdapter();

    default:
      throw new Error(
        `Unsupported platform: "${platform}". ` +
          `Currently supported: twitter, linkedin. ` +
          `See src/lib/platforms/index.ts to add new adapters.`,
      );
  }
}
