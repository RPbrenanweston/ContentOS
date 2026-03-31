// ─── Threads (Meta) OAuth 2.0 Configuration ─────────────

export const APP_ID = process.env.THREADS_APP_ID ?? '';
export const APP_SECRET = process.env.THREADS_APP_SECRET ?? '';
export const REDIRECT_URI = process.env.THREADS_REDIRECT_URI ?? '';
export const SCOPES = ['threads_basic', 'threads_content_publish'];
