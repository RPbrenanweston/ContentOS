/**
 * ContentOS extension — service worker (JS, loaded directly by Chrome).
 *
 * Mirrors background.ts. Edit both if you change behavior, or set up a build
 * step to emit this file from background.ts.
 *
 * PHASE 1 KNOWN LIMITATION: the ContentOS API currently authenticates via
 * Supabase session cookies, not bearer tokens. The PAT flow here is a UI stub
 * that expects a server-side PAT→user middleware to land in Phase 1.5.
 */

async function getConfig() {
  const res = await chrome.storage.local.get(['baseUrl', 'pat']);
  return {
    baseUrl: (res.baseUrl || '').replace(/\/+$/, ''),
    pat: res.pat || '',
  };
}

async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('src/icons/128.png'),
      title,
      message,
    });
  } catch (e) {
    // ignore
  }
}

async function getSelectionFromTab(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => (window.getSelection && window.getSelection().toString().trim()) || '',
    });
    return (result && result.result) || '';
  } catch (e) {
    return '';
  }
}

async function captureActiveTab() {
  const cfg = await getConfig();
  if (!cfg.baseUrl || !cfg.pat) {
    await notify(
      'ContentOS not configured',
      'Open the extension popup and paste your baseUrl + PAT.',
    );
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url) {
    await notify('ContentOS', 'No active tab to capture.');
    return;
  }

  const selection = await getSelectionFromTab(tab.id);

  const body = {
    url: tab.url,
    title: tab.title || null,
    text: selection || undefined,
    capturedVia: 'extension',
  };

  try {
    const res = await fetch(cfg.baseUrl + '/api/inspiration/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + cfg.pat,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let text = '';
      try {
        text = await res.text();
      } catch (e) {}
      throw new Error('HTTP ' + res.status + (text ? ': ' + text.slice(0, 120) : ''));
    }
    await notify('Saved to ContentOS', tab.title || tab.url);
  } catch (e) {
    await notify('ContentOS capture failed', e && e.message ? e.message : String(e));
  }
}

chrome.action.onClicked.addListener(() => {
  captureActiveTab();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-current-tab') {
    captureActiveTab();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'capture') {
    captureActiveTab().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
