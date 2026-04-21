/* global chrome */

const baseUrlEl = document.getElementById('baseUrl');
const patEl = document.getElementById('pat');
const saveBtn = document.getElementById('save');
const captureBtn = document.getElementById('capture');
const statusEl = document.getElementById('status');

function setStatus(text, kind) {
  statusEl.textContent = text || '';
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

async function loadConfig() {
  const { baseUrl, pat } = await chrome.storage.local.get(['baseUrl', 'pat']);
  if (baseUrl) baseUrlEl.value = baseUrl;
  if (pat) patEl.value = pat;
}

async function saveConfig() {
  const baseUrl = baseUrlEl.value.trim().replace(/\/+$/, '');
  const pat = patEl.value.trim();
  if (!baseUrl) {
    setStatus('Base URL is required', 'err');
    return;
  }
  await chrome.storage.local.set({ baseUrl, pat });
  setStatus('Saved.', 'ok');
}

async function capture() {
  setStatus('Capturing…');
  captureBtn.disabled = true;
  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'capture' }, () => resolve());
    });
    setStatus('Sent to ContentOS.', 'ok');
  } catch (e) {
    setStatus((e && e.message) || 'Capture failed', 'err');
  } finally {
    captureBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', saveConfig);
captureBtn.addEventListener('click', capture);

loadConfig();
