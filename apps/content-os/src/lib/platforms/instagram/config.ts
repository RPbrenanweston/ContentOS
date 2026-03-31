// @crumb instagram-oauth-config
// CFG | Instagram Basic Display API | OAuth credentials
// why: Centralise Instagram OAuth configuration — app credentials, scopes, and endpoint URLs
// in:[env vars INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI] out:[INSTAGRAM_CONFIG object]
// hazard: Empty appId/appSecret when env vars missing causes silent OAuth failures at runtime
// edge:./oauth.ts -> READS
// edge:../../../../infrastructure/distribution/platforms/instagram.adapter.ts -> READS
// prompt: Validate required env vars at startup; fail fast if appId is empty

export const INSTAGRAM_CONFIG = {
  appId: process.env.INSTAGRAM_APP_ID ?? '',
  appSecret: process.env.INSTAGRAM_APP_SECRET ?? '',
  redirectUri:
    process.env.INSTAGRAM_REDIRECT_URI ??
    'http://localhost:3000/api/webhooks/instagram/callback',
  scopes: ['user_profile', 'user_media'],
  authorizationUrl: 'https://api.instagram.com/oauth/authorize',
  tokenUrl: 'https://api.instagram.com/oauth/access_token',
  longLivedTokenUrl: 'https://graph.instagram.com/access_token',
}
