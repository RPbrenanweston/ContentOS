# ContentOS — OAuth Platform Setup Guide

> Step-by-step instructions for setting up every platform connection in ContentOS.
> Each section tells you exactly what to create, where to click, and what env vars to set.

---

## Quick Reference — All Env Vars

Copy this to your Vercel Environment Variables (Settings → Environment Variables):

```env
# ── X / Twitter ──
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/x/callback

# ── LinkedIn ──
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/linkedin/callback

# ── Facebook ──
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/facebook/callback

# ── Instagram ──
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/instagram/callback

# ── Threads ──
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/threads/callback

# ── YouTube ──
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/youtube/callback

# ── TikTok ──
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/tiktok/callback

# ── Reddit ──
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=https://contentos-app.vercel.app/api/webhooks/reddit/callback

# ── Token Encryption ──
TOKEN_ENCRYPTION_KEY=           # 32-byte hex key for encrypting stored OAuth tokens
```

---

## 1. X / Twitter

### What you're creating
An **OAuth 2.0 App** on the X Developer Portal.

### Steps

1. Go to [developer.x.com](https://developer.x.com) and sign in
2. If you don't have a developer account, apply for one (select "Building a tool for myself")
3. Navigate to **Projects & Apps** → **+ Create App**
4. Name it `ContentOS` (or similar)
5. Under **User authentication settings** → **Set up**:
   - **App permissions**: Select **Read and write**
   - **Type of App**: Select **Web App, Automated App or Bot**
   - **Callback URI / Redirect URL**:
     ```
     https://contentos-app.vercel.app/api/webhooks/x/callback
     ```
   - **Website URL**: `https://contentos-app.vercel.app`
6. Save → you'll get your **Client ID** and **Client Secret**
7. Copy both values

### Required Scopes (auto-requested by ContentOS)
```
tweet.read, tweet.write, users.read, offline.access, media.write
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `TWITTER_CLIENT_ID` | OAuth 2.0 Client ID from Keys & Tokens tab |
| `TWITTER_CLIENT_SECRET` | OAuth 2.0 Client Secret from Keys & Tokens tab |
| `TWITTER_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/x/callback` |

### Notes
- ContentOS uses **OAuth 2.0 with PKCE** (not OAuth 1.0a)
- X requires at minimum **Basic** tier ($100/month) for tweet.write and media.write
- The Free tier only allows tweet.read — posting will fail
- Token refresh is handled automatically by ContentOS

---

## 2. LinkedIn

### What you're creating
A **LinkedIn App** with two Products enabled.

### Steps

1. Go to [linkedin.com/developers](https://www.linkedin.com/developers/) and sign in
2. Click **Create app**
3. Fill in:
   - **App name**: `ContentOS`
   - **LinkedIn Page**: Select your company page (create one if needed)
   - **App logo**: Upload a logo
   - **Legal agreement**: Check the box
4. After creation, go to the **Products** tab
5. Request access to these Products:
   - **Sign In with LinkedIn using OpenID Connect** (auto-approved)
   - **Share on LinkedIn** (may require review — usually instant for verified pages)
6. Go to the **Auth** tab:
   - Under **OAuth 2.0 settings** → **Authorized redirect URLs**:
     ```
     https://contentos-app.vercel.app/api/webhooks/linkedin/callback
     ```
   - Copy the **Client ID** and **Primary Client Secret**

### Required Scopes (auto-requested by ContentOS)
```
openid, profile, email, w_member_social
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `LINKEDIN_CLIENT_ID` | Auth tab → Client ID |
| `LINKEDIN_CLIENT_SECRET` | Auth tab → Primary Client Secret |
| `LINKEDIN_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/linkedin/callback` |

### Notes
- `w_member_social` scope is what allows posting — requires "Share on LinkedIn" product
- LinkedIn org page posting requires additional setup (ContentOS handles entity selection)
- Tokens expire after 60 days — ContentOS will prompt reconnection

---

## 3. Facebook Pages

### What you're creating
A **Meta App** on Facebook for Developers with Pages API access.

### Steps

1. Go to [developers.facebook.com](https://developers.facebook.com) and sign in
2. Click **My Apps** → **Create App**
3. Select **Business** type → **Next**
4. Fill in:
   - **App name**: `ContentOS`
   - **Contact email**: your email
   - **Business portfolio**: Select yours or skip
5. After creation, go to **App settings** → **Basic**:
   - Copy the **App ID** and **App Secret**
6. In the left sidebar, click **+ Add Product**:
   - Find **Facebook Login for Business** → **Set Up**
   - Under **Settings** → **Valid OAuth Redirect URIs**:
     ```
     https://contentos-app.vercel.app/api/webhooks/facebook/callback
     ```
7. Under **App Review** → **Permissions and Features**, request:
   - `pages_manage_posts` — **Required** (allows creating posts on Pages)
   - `pages_read_engagement` — **Required** (read post metrics)
   - `pages_show_list` — **Required** (list user's Pages)
   - `public_profile` — Auto-granted

### Required Scopes (auto-requested by ContentOS)
```
pages_manage_posts, pages_read_engagement, pages_show_list, public_profile
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `FACEBOOK_APP_ID` | App Settings → Basic → App ID |
| `FACEBOOK_APP_SECRET` | App Settings → Basic → App Secret |
| `FACEBOOK_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/facebook/callback` |

### Notes
- The same Meta App can be used for Facebook, Instagram, and Threads (see below)
- For development, add yourself as a test user or set the app to Development mode
- Production use requires App Review approval for each permission
- Facebook Pages only (not personal profiles) — users must have admin access to a Page

---

## 4. Instagram

### What you're creating
Uses the **same Meta App** as Facebook (Step 3), but with Instagram API added.

### Steps

1. In your existing Meta App (from Step 3), click **+ Add Product**
2. Find **Instagram Basic Display** → **Set Up** (or **Instagram** → **Set Up**)
3. Under **Basic Display** → **Settings**:
   - **Valid OAuth Redirect URIs**:
     ```
     https://contentos-app.vercel.app/api/webhooks/instagram/callback
     ```
   - **Deauthorize callback URL**: (can leave blank for now)
   - **Data deletion request URL**: (can leave blank for now)
4. Under **Roles** → **Instagram Testers**, add your Instagram account
5. Go to your Instagram app → Settings → Apps and Websites → Tester invites → Accept

### Required Scopes (auto-requested by ContentOS)
```
user_profile, user_media
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `INSTAGRAM_APP_ID` | Same App ID as Facebook (App Settings → Basic) |
| `INSTAGRAM_APP_SECRET` | Same App Secret as Facebook, OR the Instagram App Secret from Instagram Basic Display settings |
| `INSTAGRAM_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/instagram/callback` |

### Notes
- Instagram Basic Display API is being deprecated — Meta is transitioning to Instagram Graph API
- For posting capabilities, you may need to use the Instagram Graph API (requires a Facebook Page connected to Instagram Professional account)
- Instagram Personal accounts have limited API access — Professional/Business accounts recommended

---

## 5. Threads

### What you're creating
Uses the **same Meta App** as Facebook (Step 3), but with Threads API enabled.

### Steps

1. In your existing Meta App (from Step 3), click **+ Add Product**
2. Find **Threads** → **Set Up**
3. Under Threads API settings:
   - **Redirect URI**:
     ```
     https://contentos-app.vercel.app/api/webhooks/threads/callback
     ```
4. Your Meta App ID and Secret are the same ones used for Facebook

### Required Scopes (auto-requested by ContentOS)
```
threads_basic, threads_content_publish
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `THREADS_APP_ID` | Same App ID as Facebook |
| `THREADS_APP_SECRET` | Same App Secret as Facebook |
| `THREADS_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/threads/callback` |

### Notes
- Threads API was released in June 2024
- Short-lived tokens are automatically exchanged for 60-day long-lived tokens by ContentOS
- Only works with Threads accounts (must be an Instagram user who has Threads)
- Threads API has rate limits: 250 posts per 24 hours

---

## 6. YouTube

### What you're creating
A **Google Cloud Project** with YouTube Data API v3 enabled.

### Steps

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project: **Select project** → **New Project** → Name it `ContentOS`
3. Enable the YouTube Data API:
   - Go to **APIs & Services** → **Library**
   - Search for **YouTube Data API v3** → Click it → **Enable**
4. Create OAuth credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - If prompted, configure the **OAuth consent screen** first:
     - **User Type**: External
     - **App name**: `ContentOS`
     - **User support email**: your email
     - **Developer contact**: your email
     - Add scopes: `youtube.upload`, `youtube.readonly`
     - Add test users: your Gmail address
     - Save
   - Back to Credentials → **+ CREATE CREDENTIALS** → **OAuth client ID**:
     - **Application type**: Web application
     - **Name**: `ContentOS`
     - **Authorized redirect URIs**:
       ```
       https://contentos-app.vercel.app/api/webhooks/youtube/callback
       ```
   - Click **Create** → Copy **Client ID** and **Client Secret**

### Required Scopes (auto-requested by ContentOS)
```
https://www.googleapis.com/auth/youtube.upload
https://www.googleapis.com/auth/youtube.readonly
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `YOUTUBE_CLIENT_ID` | Credentials → OAuth 2.0 Client ID |
| `YOUTUBE_CLIENT_SECRET` | Credentials → Client Secret |
| `YOUTUBE_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/youtube/callback` |

### Notes
- Google OAuth starts in "Testing" mode (max 100 users). For production, submit for verification
- Verification requires a privacy policy URL and may take 1-4 weeks
- The `youtube.upload` scope is a "sensitive scope" requiring additional verification
- Refresh tokens are permanent (won't expire unless revoked)

---

## 7. TikTok

### What you're creating
A **TikTok Developer App** with Content Posting API access.

### Steps

1. Go to [developers.tiktok.com](https://developers.tiktok.com) and sign up/sign in
2. Click **Manage apps** → **Connect an app**
3. Fill in:
   - **App name**: `ContentOS`
   - **Description**: Content distribution tool
   - **Platform**: Web
   - **Category**: Social Media / Content Creation
4. After creation, go to **Manage apps** → your app:
   - Under **Products** → click **+ Add products**:
     - **Login Kit** — Add
     - **Content Posting API** — Add (may require approval)
   - Under **Login Kit** → **Configuration**:
     - **Redirect URI**:
       ```
       https://contentos-app.vercel.app/api/webhooks/tiktok/callback
       ```
5. Go to **Keys** tab → Copy your **Client Key** and **Client Secret**

### Required Scopes (auto-requested by ContentOS)
```
user.info.basic, video.publish, video.upload
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `TIKTOK_CLIENT_KEY` | App Keys tab → Client Key |
| `TIKTOK_CLIENT_SECRET` | App Keys tab → Client Secret |
| `TIKTOK_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/tiktok/callback` |

### Notes
- TikTok calls it "Client Key" (not Client ID) — ContentOS uses `TIKTOK_CLIENT_KEY`
- Content Posting API requires sandbox approval before production
- Only video content is supported (no text-only posts on TikTok)
- Max video size: 4 GB, max duration: 10 minutes

---

## 8. Reddit

### What you're creating
A **Reddit OAuth "web app"** in preferences.

### Steps

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) while logged in
2. Scroll to the bottom → Click **create another app...**
3. Fill in:
   - **Name**: `ContentOS`
   - **App type**: Select **web app**
   - **Description**: Content distribution tool
   - **About URL**: `https://contentos-app.vercel.app`
   - **Redirect URI**:
     ```
     https://contentos-app.vercel.app/api/webhooks/reddit/callback
     ```
4. Click **Create app**
5. Your **Client ID** is the string under the app name (e.g., `a1b2c3d4e5f6`)
6. Your **Client Secret** is shown as "secret"

### Required Scopes (auto-requested by ContentOS)
```
identity, submit, read
```

### Env Vars
| Variable | Where to find it |
|---|---|
| `REDDIT_CLIENT_ID` | The string shown under your app name |
| `REDDIT_CLIENT_SECRET` | The "secret" field |
| `REDDIT_REDIRECT_URI` | `https://contentos-app.vercel.app/api/webhooks/reddit/callback` |

### Notes
- Reddit is the simplest OAuth setup — no approval process for personal use
- ContentOS requests `duration=permanent` so refresh tokens don't expire
- Reddit API requires a `User-Agent` header — ContentOS sends `ContentOS/1.0`
- Rate limit: 60 requests/minute

---

## 9. Bluesky (No Developer Account Needed)

### What you're creating
**Nothing.** Users provide their own credentials via the BYOK modal.

### How it works
1. User clicks "Connect" on Bluesky in the Channels page
2. Modal asks for their **Bluesky handle** (e.g., `user.bsky.social`) and **App Password**
3. ContentOS validates via AT Protocol's `com.atproto.server.createSession`
4. Credentials are encrypted and stored

### User instructions (to show in your docs/help)
1. Go to [bsky.app](https://bsky.app) → Settings → **App Passwords**
2. Click **Add App Password** → Name it `ContentOS`
3. Copy the generated password
4. Paste it into the ContentOS connect modal

### Env Vars
None needed.

---

## 10. Ghost (No Developer Account Needed)

### What you're creating
**Nothing.** Users provide their own Ghost Admin API key.

### How it works
1. User clicks "Connect" on Ghost in the Channels page
2. Modal asks for their **Ghost URL** (e.g., `https://myblog.ghost.io`) and **Admin API Key**
3. ContentOS validates by calling `GET /ghost/api/admin/settings/` with a JWT generated from the key
4. Credentials are encrypted and stored

### User instructions
1. In your Ghost admin panel, go to **Settings** → **Integrations**
2. Click **+ Add custom integration** → Name it `ContentOS`
3. Copy the **Admin API Key** (format: `{id}:{secret}`)
4. Paste it into the ContentOS connect modal along with your Ghost site URL

### Env Vars
None needed.

---

## 11. beehiiv (No Developer Account Needed)

### What you're creating
**Nothing.** Users provide their own beehiiv API key.

### How it works
1. User clicks "Connect" on beehiiv in the Channels page
2. Modal asks for their **API Key** and **Publication ID**
3. ContentOS validates by calling `GET /v2/publications/{id}`
4. Credentials are encrypted and stored

### User instructions
1. In beehiiv, go to **Settings** → **Integrations** → **API**
2. Generate a new API key with **Write** permissions
3. Copy your **Publication ID** from the URL bar or settings
4. Paste both into the ContentOS connect modal

### Env Vars
None needed.

---

## 12. Medium (No Developer Account Needed)

### What you're creating
**Nothing.** Users provide their own Medium integration token.

### How it works
1. User clicks "Connect" on Medium in the Channels page
2. Modal asks for their **Integration Token**
3. ContentOS validates by calling `GET /v1/me`
4. Credentials are encrypted and stored

### User instructions
1. Go to [medium.com](https://medium.com) → Settings → **Security and apps**
2. Scroll to **Integration tokens** → Generate a new token
3. Name it `ContentOS` and copy the token
4. Paste it into the ContentOS connect modal

### Env Vars
None needed.

---

## Setting Env Vars in Vercel

1. Go to [vercel.com](https://vercel.com) → your **contentos-app** project
2. Click **Settings** → **Environment Variables**
3. Add each variable one at a time:
   - **Key**: e.g., `TWITTER_CLIENT_ID`
   - **Value**: paste the value from the developer portal
   - **Environment**: Select all (Production, Preview, Development)
4. After adding all variables, **redeploy** the project:
   - Go to **Deployments** → click the `...` on the latest → **Redeploy**

### Token Encryption Key

ContentOS encrypts stored OAuth tokens at rest. Generate a key:

```bash
openssl rand -hex 32
```

Set this as `TOKEN_ENCRYPTION_KEY` in Vercel env vars. **Never change this after tokens are stored** or all existing connections will break.

---

## Priority Order (Recommended)

Start with the platforms you'll use most. Recommended order:

1. **X / Twitter** + **LinkedIn** — core social platforms, most content creators start here
2. **Reddit** — simplest OAuth setup (5 minutes)
3. **Bluesky** — zero setup (BYOK)
4. **Facebook** — then add Instagram and Threads using the same Meta App
5. **YouTube** — takes longest due to Google verification
6. **TikTok** — requires developer app approval
7. **Ghost / beehiiv / Medium** — zero setup (BYOK), enable when needed

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Connect" button redirects to error page | Missing env vars | Check Vercel env vars are set for that platform |
| OAuth callback returns `state_mismatch` | Cookie blocked or expired | Try in incognito, ensure cookies enabled |
| Token stored but posting fails | Insufficient scopes/permissions | Check developer portal — ensure write permissions granted |
| `401 Unauthorized` on post | Token expired | Reconnect the account (click Reconnect button) |
| Instagram returns `Invalid scope` | Using wrong API type | Ensure Instagram Graph API, not Basic Display |
