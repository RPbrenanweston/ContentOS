/**
 * ContentOS extension — service worker.
 *
 * On toolbar click or Cmd/Ctrl+Shift+S:
 *   1. Get active tab URL + title.
 *   2. Run a content script to grab window.getSelection().toString().
 *   3. POST { url, title, text, capturedVia: 'extension' } to
 *      `${baseUrl}/api/inspiration/capture` with Authorization: Bearer <PAT>.
 *
 * Config (baseUrl + PAT) is stored in chrome.storage.local and set via popup.
 *
 * PHASE 1 KNOWN LIMITATION: the ContentOS API currently authenticates via
 * Supabase session cookies, not bearer tokens. The PAT flow here is a UI stub
 * that expects a server-side PAT→user middleware to land in Phase 1.5.
 * Errors from the server will surface in the chrome notification.
 *
 * This file is authored as TypeScript for readability, but the manifest loads
 * `src/background.js`. When you compile, emit `background.js` next to it.
 * (Chrome won't execute .ts directly.) For pure-JS callers, see background.js.
 */

// Included here for type reference when the file is compiled.
declare const chrome: any;

interface ExtensionConfig {
  baseUrl?: string;
  pat?: string;
}

async function getConfig(): Promise<ExtensionConfig> {
  const res = await chrome.storage.local.get(['baseUrl', 'pat']);
  return {
    baseUrl: (res.baseUrl as string | undefined)?.replace(/\/+$/, ''),
    pat: res.pat as string | undefined,
  };
}

async function notify(title: string, message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('src/icons/128.png'),
      title,
      message,
    });
  } catch {
    // Notifications may be unavailable — ignore.
  }
}

async function getSelectionFromTab(tabId: number): Promise<string> {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => (window.getSelection?.()?.toString() ?? '').trim(),
    });
    return (result?.result as string | undefined) ?? '';
  } catch {
    return '';
  }
}

async function captureActiveTab(): Promise<void> {
  const cfg = await getConfig();
  if (!cfg.baseUrl || !cfg.pat) {
    await notify(
      'ContentOS not configured',
      'Open the extension popup and paste your baseUrl + PAT.',
    );
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    await notify('ContentOS', 'No active tab to capture.');
    return;
  }

  const selection = await getSelectionFromTab(tab.id);

  const body = {
    url: tab.url,
    title: tab.title ?? null,
    text: selection || undefined,
    capturedVia: 'extension',
  };

  try {
    const res = await fetch(`${cfg.baseUrl}/api/inspiration/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.pat}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
    }
    await notify('Saved to ContentOS', tab.title ?? tab.url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await notify('ContentOS capture failed', msg);
  }
}

chrome.action.onClicked.addListener(() => {
  // Only fires if default_popup is removed; we keep the popup so this is a no-op
  // unless the user explicitly removes it. Leaving handler for completeness.
  void captureActiveTab();
});

chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'capture-current-tab') {
    void captureActiveTab();
  }
});

// Allow the popup to trigger a capture without the user closing it.
chrome.runtime.onMessage.addListener(
  (msg: { type?: string }, _sender: unknown, sendResponse: (r: unknown) => void) => {
    if (msg?.type === 'capture') {
      void captureActiveTab().then(() => sendResponse({ ok: true }));
      return true; // async response
    }
    return false;
  },
);
