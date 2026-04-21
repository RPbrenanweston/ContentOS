# ContentOS Capture — Browser Extension (Manifest V3)

One-click "save this page to my ContentOS inspiration library" for Chromium
browsers (Chrome, Edge, Brave, Arc).

## Install (unpacked, dev)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this folder (`packages/extension`).
4. Pin the **ContentOS Capture** icon to your toolbar.

## Configure

1. Click the extension icon to open the popup.
2. Fill in:
   - **Base URL** — e.g. `http://localhost:3000` in dev, or your deployed URL.
   - **Personal Access Token (PAT)** — see *Phase 1 auth limitation* below.
3. Click **Save config**.

## Use

- Click the extension icon → **Capture tab** to save the current page.
- Or press the keyboard shortcut:
  - macOS: **⌘⇧S** (Command + Shift + S)
  - Windows/Linux: **Ctrl + Shift + S**
- If you have text selected on the page, the selection is sent along with the
  page URL and title.

The extension POSTs to `${baseUrl}/api/inspiration/capture`:

```json
{
  "url": "https://example.com/article",
  "title": "Example article",
  "text": "optional selected text",
  "capturedVia": "extension"
}
```

with header `Authorization: Bearer <PAT>`.

## Phase 1 auth limitation (IMPORTANT)

The ContentOS API currently authenticates via **Supabase session cookies**,
not bearer tokens. The extension can't send those cookies cross-origin, so
**the PAT flow does not yet work end-to-end against a production deploy**.

The popup, storage, background worker, and request shape are all correct —
what's missing is a server-side middleware that:

1. Accepts `Authorization: Bearer <PAT>`.
2. Resolves the PAT to a Supabase `user_id`.
3. Injects that user into the request context so `/api/inspiration/capture`
   treats it the same as a cookied session.

TODO (Phase 1.5, ~30 min on the backend):

- Add a `personal_access_tokens` table (`user_id`, `token_hash`, `name`,
  `created_at`, `last_used_at`, `revoked_at`).
- Add PAT-minting UI in the ContentOS settings page.
- Add bearer-token middleware in `apps/content-os/src/lib/api-handler.ts` (or
  equivalent auth helper) that maps bearer → user and falls through to the
  existing cookie flow.

Until that ships, use the extension against a **dev server you're logged into
in the same browser** — Chrome will include your session cookies on
same-origin fetches, and the `Authorization` header is ignored. For any other
host you'll get `401` until the middleware lands.

## Files

```
packages/extension/
├── manifest.json       Manifest V3
├── package.json
├── README.md           ← you are here
└── src/
    ├── background.ts   Reference source (TypeScript, not loaded by Chrome)
    ├── background.js   Actual service worker (loaded by manifest)
    ├── popup.html      Config popup
    ├── popup.js
    └── icons/          16/48/128 placeholders — replace before shipping
```

## Development notes

- There is no build step. `background.js` is the shipping file. `background.ts`
  is kept in sync by hand as a readable reference; if behavior drifts, edit
  both or wire up esbuild/tsc to emit `background.js` from the `.ts` source.
- Icons in `src/icons/` are placeholders — drop real 16/48/128 PNGs in before
  shipping to the Chrome Web Store.
- Permissions: `activeTab`, `storage`, `scripting`, `notifications`, plus
  `<all_urls>` host permissions so the selection-reading content script works
  on any site.
