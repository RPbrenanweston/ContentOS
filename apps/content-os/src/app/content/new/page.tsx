// @crumb content-creation-editor
// UI | editor | multi-format-authoring
// why: Central authoring interface supporting blog, video, audio formats with planning guide, voice input, sprint timer, and media upload
// in:[plan-data-localstorage] out:[JSX-editor-ui] err:[upload-failure, save-failure, storage-parse-error]
// hazard: No error UI on file upload failures; upload error logs silently while user waits indefinitely
// hazard: saveContent() doesn't validate editTitle non-empty; empty titles create malformed content nodes
// hazard: Timer interval cleanup in useEffect doesn't fire on unmount if sprint "active"; memory leak + stale timer
// hazard: voiceInputRef accessed without null check in handleVoiceToggle; throws error if ref attachment fails
// hazard: localStorage.getItem('activePlan') parsed without try/catch; corrupted localStorage crashes component on mount
// edge:../../components/editor/tiptap-editor.tsx -> USES
// edge:../../hooks/use-voice-input.ts -> USES
// edge:/api/media/upload -> API-ENDPOINT
// edge:/api/content -> API-ENDPOINT
// edge:../[id]/page.tsx -> NAVIGATES-TO
// edge:./page.tsx -> localStorage-dependency
// prompt: Add error boundary for upload failures; validate editTitle before save; implement robust interval cleanup; null-check voice ref; wrap localStorage parse in try/catch with fallback

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TipTapEditor, type TipTapEditorHandle } from '@/components/editor/tiptap-editor';
import { useVoiceInput } from '@/hooks/use-voice-input';
import type { ContentNodeType } from '@/domain';

type SprintState = 'idle' | 'setup' | 'active' | 'complete';

interface PlanSection {
  title: string;
  prompt: string;
  hint?: string;
  notes: string;
}

interface ActivePlan {
  title: string;
  frameworkName: string;
  sections: PlanSection[];
}

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentNodeType>('blog');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sourceFile, setSourceFile] = useState<{ url: string; name: string; type: string } | null>(null);

  /* ─── Plan from Plan page ─── */
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('activePlan');
      if (stored) {
        const parsed = JSON.parse(stored) as ActivePlan;
        setPlan(parsed);
        if (parsed.title) setTitle(parsed.title);
        localStorage.removeItem('activePlan');
      }
    } catch { /* ignore parse errors */ }
  }, []);

  /* ─── Sprint state ─── */
  const [sprintState, setSprintState] = useState<SprintState>('idle');
  const [inputTarget, setInputTarget] = useState('500');
  const [inputMinutes, setInputMinutes] = useState('25');
  const [wordTarget, setWordTarget] = useState(0);
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Voice input ─── */
  const editorRef = useRef<TipTapEditorHandle | null>(null);

  const voice = useVoiceInput({
    provider: 'browser',
    language: 'en-GB',
    onTranscript: (text) => {
      // Insert transcribed text at TipTap cursor — onChange will sync bodyText
      editorRef.current?.insertText(text);
    },
  });

  // Keyboard shortcut: Cmd+Shift+V to toggle voice
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        voice.toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [voice.toggle]);

  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 250));
  const targetProgress = wordTarget > 0 ? Math.min(wordCount / wordTarget, 1) : 0;
  const targetHit = wordTarget > 0 && wordCount >= wordTarget;
  const timerProgress = timerDuration > 0 ? (timerDuration - timerRemaining) / timerDuration : 0;

  useEffect(() => {
    if (sprintState === 'active' && !isPaused && timerRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); setSprintState('complete'); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sprintState, isPaused, timerRemaining]);

  useEffect(() => {
    if (sprintState === 'active' && targetHit) { setSprintState('complete'); if (timerRef.current) clearInterval(timerRef.current); }
  }, [sprintState, targetHit]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const launchSprint = () => {
    const t = parseInt(inputTarget) || 0, m = parseInt(inputMinutes) || 0;
    if (t <= 0 && m <= 0) return;
    setWordTarget(t); setTimerDuration(m * 60); setTimerRemaining(m * 60); setIsPaused(false); setSprintState('active');
  };

  const endSprint = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSprintState('idle'); setWordTarget(0); setTimerDuration(0); setTimerRemaining(0); setIsPaused(false);
  };

  const handleEditorChange = useCallback((html: string, text: string) => { setBodyHtml(html); setBodyText(text); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSourceFile({ url: data.url, name: file.name, type: file.type });
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    } catch (err) { console.error('Upload failed:', err); } finally { setUploadingFile(false); }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { title: title.trim(), contentType };
      if (contentType === 'blog') { body.bodyHtml = bodyHtml; body.bodyText = bodyText; }
      const res = await fetch('/api/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      if (sourceFile) { await fetch(`/api/content/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceUrl: sourceFile.url }) }); }
      setLastSaved(new Date()); router.push(`/content/${data.id}`);
    } catch (err) { console.error('Save failed:', err); } finally { setSaving(false); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg p-0.5" style={{ backgroundColor: 'var(--theme-surface)' }}>
            {(['blog', 'video', 'audio'] as ContentNodeType[]).map((type) => (
              <button key={type} onClick={() => setContentType(type)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize"
                style={{ backgroundColor: contentType === type ? 'var(--theme-pill-active-bg)' : 'transparent', color: contentType === type ? 'var(--theme-pill-active-text)' : 'var(--theme-pill-inactive-text)' }}>
                {type}
              </button>
            ))}
          </div>

          {contentType === 'blog' && (
            <>
              <div className="w-px h-5" style={{ backgroundColor: 'var(--theme-border)' }} />

              {/* Guide toggle — only when a plan is loaded */}
              {plan && (
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: showGuide ? 'var(--theme-tag-bg)' : 'transparent',
                    color: showGuide ? 'var(--theme-tag-text)' : 'var(--theme-muted)',
                    border: showGuide ? '1px solid var(--theme-tag-border)' : '1px solid transparent',
                  }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  Guide
                </button>
              )}

              {/* Voice input */}
              {voice.isSupported && (
                <button
                  onClick={voice.toggle}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: voice.isRecording ? 'rgba(255, 69, 58, 0.15)' : 'transparent',
                    color: voice.isRecording ? 'var(--theme-accent)' : 'var(--theme-muted)',
                    border: voice.isRecording ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid transparent',
                  }}
                  title="Voice input (⌘⇧V)"
                >
                  {voice.isRecording ? (
                    /* Recording indicator — pulsing dot + mic */
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--theme-accent)' }} />
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--theme-accent)' }} />
                      </span>
                      Recording...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                      Voice
                    </>
                  )}
                </button>
              )}

              {sprintState === 'idle' && (
                <button onClick={() => setSprintState('setup')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Sprint
                </button>
              )}

              {sprintState === 'setup' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <input type="number" min="1" value={inputTarget} onChange={(e) => setInputTarget(e.target.value)}
                      className="w-14 bg-transparent text-xs font-medium outline-none text-center" style={{ color: 'var(--theme-foreground)' }} />
                    <span className="text-ui-sm">words</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <input type="number" min="1" max="180" value={inputMinutes} onChange={(e) => setInputMinutes(e.target.value)}
                      className="w-10 bg-transparent text-xs font-medium outline-none text-center" style={{ color: 'var(--theme-foreground)' }} />
                    <span className="text-ui-sm">min</span>
                  </div>
                  <button onClick={launchSprint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
                    style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Go
                  </button>
                  <button onClick={() => setSprintState('idle')} className="p-1.5 rounded-md" style={{ color: 'var(--theme-muted)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              )}

              {sprintState === 'active' && (
                <div className="flex items-center gap-2">
                  {wordTarget > 0 && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" style={{ stroke: 'var(--theme-border)' }} />
                        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" strokeLinecap="round"
                          strokeDasharray={`${targetProgress * 50.27} 50.27`} style={{ stroke: targetHit ? 'var(--theme-success)' : 'var(--theme-primary)' }} />
                      </svg>
                      <span style={{ color: 'var(--theme-foreground)' }}>{wordCount.toLocaleString()}</span>
                      <span style={{ color: 'var(--theme-muted)' }}>/ {wordTarget.toLocaleString()}</span>
                    </div>
                  )}
                  {timerDuration > 0 && (
                    <button onClick={() => setIsPaused(!isPaused)} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium"
                      style={{ backgroundColor: 'var(--theme-surface)', color: timerRemaining < 60 ? 'var(--theme-accent)' : 'var(--theme-foreground)' }}>
                      <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" style={{ stroke: 'var(--theme-border)' }} />
                        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" strokeLinecap="round"
                          strokeDasharray={`${timerProgress * 50.27} 50.27`} style={{ stroke: timerRemaining < 60 ? 'var(--theme-accent)' : 'var(--theme-primary)' }} />
                      </svg>
                      {formatTime(timerRemaining)}
                    </button>
                  )}
                  <button onClick={endSprint} className="p-1.5 rounded-md" style={{ color: 'var(--theme-muted)' }}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
                  </button>
                </div>
              )}

              {sprintState === 'complete' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--theme-success)' }}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    {wordCount.toLocaleString()} words
                  </div>
                  <button onClick={() => setSprintState('setup')} className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>New sprint</button>
                  <button onClick={endSprint} className="p-1.5 rounded-md" style={{ color: 'var(--theme-muted)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Live transcription preview */}
          {voice.isRecording && voice.interimText && (
            <span className="text-xs italic max-w-[200px] truncate" style={{ color: 'var(--theme-muted)' }}>
              {voice.interimText}
            </span>
          )}
          <div className="flex items-center gap-3 text-ui-sm">
            {wordCount > 0 && sprintState !== 'active' && sprintState !== 'complete' && (
              <><span>{wordCount.toLocaleString()} words</span><span style={{ color: 'var(--theme-border)' }}>|</span><span>{readingTime} min read</span></>
            )}
            {lastSaved && (<><span style={{ color: 'var(--theme-border)' }}>|</span><span style={{ color: 'var(--theme-success)' }}>Saved</span></>)}
          </div>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-4 py-1.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {(sprintState === 'active' || sprintState === 'complete') && wordTarget > 0 && (
        <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--theme-border)' }}>
          <div className="h-full transition-all duration-300 ease-out"
            style={{ width: `${targetProgress * 100}%`, backgroundColor: targetHit ? 'var(--theme-success)' : 'var(--theme-primary)' }} />
        </div>
      )}

      {/* Writing area — with optional plan sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Plan guide sidebar */}
        {plan && showGuide && contentType === 'blog' && (
          <div
            className="w-[280px] shrink-0 overflow-y-auto"
            style={{ borderRight: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
                  {plan.frameworkName}
                </h3>
              </div>

              <div className="space-y-1">
                {plan.sections.map((section, i) => {
                  const hasNotes = section.notes.trim().length > 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveSection(i)}
                      className="w-full text-left p-3 rounded-lg transition-colors"
                      style={{
                        backgroundColor: activeSection === i ? 'var(--theme-background)' : 'transparent',
                        border: activeSection === i ? '1px solid var(--theme-border)' : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                          style={{
                            backgroundColor: activeSection === i ? 'var(--theme-primary)' : hasNotes ? 'rgba(16, 185, 129, 0.15)' : 'var(--theme-border)',
                            color: activeSection === i ? 'var(--theme-btn-primary-text)' : hasNotes ? 'var(--theme-success)' : 'var(--theme-muted)',
                          }}
                        >
                          {hasNotes && activeSection !== i ? '✓' : i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight" style={{
                            color: activeSection === i ? 'var(--theme-foreground)' : 'var(--theme-muted)',
                          }}>
                            {section.title}
                          </p>
                          {activeSection === i && (
                            <div className="mt-2">
                              <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-foreground)' }}>
                                {section.prompt}
                              </p>
                              {section.hint && (
                                <p className="text-[11px] mt-1.5 italic" style={{ color: 'var(--theme-muted)' }}>
                                  💡 {section.hint}
                                </p>
                              )}
                              {hasNotes && (
                                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--theme-border)' }}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--theme-muted)' }}>
                                    Your notes
                                  </p>
                                  <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-foreground)' }}>
                                    {section.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
        {contentType === 'blog' ? (
          <div className="h-full flex flex-col">
            <div className="max-w-[780px] mx-auto w-full px-6 pt-12 pb-2">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your title"
                className="w-full bg-transparent text-[42px] font-bold outline-none leading-tight tracking-tight"
                style={{ color: 'var(--theme-foreground)', fontFamily: 'var(--font-sans)' }} />
            </div>
            <div className="flex-1">
              <TipTapEditor ref={editorRef} content="" onChange={handleEditorChange} placeholder="Tell your story..." mode="write" />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-[500px] mb-8 px-6">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a name"
                className="w-full bg-transparent text-2xl font-semibold outline-none text-center" style={{ color: 'var(--theme-foreground)' }} />
            </div>
            {sourceFile ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--theme-success)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--theme-foreground)' }}>{sourceFile.name}</p>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="w-64 border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: 'var(--theme-border)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <svg className="w-6 h-6" style={{ color: 'var(--theme-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--theme-foreground)' }}>{uploadingFile ? 'Uploading...' : `Upload ${contentType}`}</p>
                  <p className="text-ui-sm">{contentType === 'video' ? 'MP4, WebM, MOV' : 'MP3, WAV, OGG'}</p>
                </div>
                <input type="file" accept={contentType === 'video' ? 'video/*' : 'audio/*'} onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
              </label>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
