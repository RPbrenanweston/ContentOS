export { LinkedInAdapter } from './linkedin.adapter';
export { RedditAdapter } from './reddit.adapter';
export { XAdapter } from './x.adapter';
export { BlueskyAdapter } from './bluesky.adapter';
export { ThreadsAdapter } from './threads.adapter';
export { SubstackAdapter } from './substack.adapter';

// Register all adapters at module load time
import { registerAdapter } from '../platform-adapter';
import { LinkedInAdapter } from './linkedin.adapter';
import { RedditAdapter } from './reddit.adapter';
import { XAdapter } from './x.adapter';
import { BlueskyAdapter } from './bluesky.adapter';
import { ThreadsAdapter } from './threads.adapter';
import { SubstackAdapter } from './substack.adapter';

registerAdapter(new LinkedInAdapter());
registerAdapter(new RedditAdapter());
registerAdapter(new XAdapter());
registerAdapter(new BlueskyAdapter());
registerAdapter(new ThreadsAdapter());
registerAdapter(new SubstackAdapter());
