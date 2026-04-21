'use client';

import { useEffect, useRef, useState } from 'react';

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
}

function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return !!u.hostname && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function QuickCaptureModal({ open, onClose }: QuickCaptureModalProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setError(null);
      // Defer focus to next tick so element is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function submit() {
    const value = input.trim();
    if (!value || submitting) return;

    const body: Record<string, unknown> = {
      capturedVia: 'manual',
    };
    if (looksLikeUrl(value)) {
      body.url = value.startsWith('http') ? value : `https://${value}`;
    } else {
      body.text = value;
      body.sourceType = 'manual';
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/inspiration/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Capture failed (${res.status})`);
      }
      setToast('Saved, processing in background');
      setInput('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Capture failed');
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl border border-border"
            style={{ backgroundColor: 'var(--theme-background)' }}
          >
            <div className="h-12 border-b border-border flex items-center justify-between px-4">
              <span className="font-button text-primary">QUICK CAPTURE</span>
              <button
                type="button"
                onClick={onClose}
                className="font-button text-xs text-muted hover:text-foreground"
                aria-label="Close"
              >
                ESC
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Paste a URL or type a note…"
                rows={4}
                className="w-full bg-surface border border-border p-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                disabled={submitting}
              />
              {error && (
                <p className="font-small text-accent text-[11px]">{error}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="font-small text-muted text-[11px]">
                  {looksLikeUrl(input) ? 'URL detected' : 'Free-form note'}
                  {' · '}
                  Enter to save, Shift+Enter for newline
                </span>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!input.trim() || submitting}
                  className="border border-primary text-primary font-button text-xs px-3 py-1 hover:bg-primary hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'SAVING…' : 'CAPTURE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 border border-primary bg-surface px-4 py-2 font-small text-primary text-[12px]">
          {toast}
        </div>
      )}
    </>
  );
}
