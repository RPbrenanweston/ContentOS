import { registerAdapter } from '../platform-adapter';
import { LinkedInAdapter } from './linkedin.adapter';
import { RedditAdapter } from './reddit.adapter';
import { XAdapter } from './x.adapter';
import { BlueskyAdapter } from './bluesky.adapter';
import { ThreadsAdapter } from './threads.adapter';
import { SubstackAdapter } from './substack.adapter';
import { BeehiivAdapter } from './beehiiv.adapter';
import { GhostAdapter } from './ghost.adapter';
import { MediumAdapter } from './medium.adapter';
import { FacebookAdapter } from './facebook.adapter';

// Register all adapters at module load time
registerAdapter(new LinkedInAdapter());
registerAdapter(new RedditAdapter());
registerAdapter(new XAdapter());
registerAdapter(new BlueskyAdapter());
registerAdapter(new ThreadsAdapter());
registerAdapter(new SubstackAdapter());
registerAdapter(new BeehiivAdapter());
registerAdapter(new GhostAdapter());
registerAdapter(new MediumAdapter());
registerAdapter(new FacebookAdapter());

export { LinkedInAdapter } from './linkedin.adapter';
export { RedditAdapter } from './reddit.adapter';
export { XAdapter } from './x.adapter';
export { BlueskyAdapter } from './bluesky.adapter';
export { ThreadsAdapter } from './threads.adapter';
export { SubstackAdapter } from './substack.adapter';
export { BeehiivAdapter } from './beehiiv.adapter';
export { GhostAdapter } from './ghost.adapter';
export { MediumAdapter } from './medium.adapter';
export { FacebookAdapter } from './facebook.adapter';
