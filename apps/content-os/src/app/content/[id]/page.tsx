'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { TipTapEditor } from '@/components/editor/tiptap-editor';
import { StatusBadge } from '@/components/content/status-badge';
import type { ContentNode, ContentSegment } from '@/domain';

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [node, setNode] = useState<(ContentNode & { segments: ContentSegment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/content/${id}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setNode(data);
      } catch (e) {
        console.error('Failed to load content:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = useCallback(async (html: string, text: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyHtml: html,
          bodyText: text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setNode((prev) => prev ? { ...prev, ...updated } : null);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  }, [id]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/content/${id}/process`, { method: 'POST' });
      if (!res.ok) throw new Error('Process trigger failed');
      // Reload to get updated status
      const nodeRes = await fetch(`/api/content/${id}`);
      const data = await nodeRes.json();
      setNode(data);
    } catch (e) {
      console.error('Process failed:', e);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="font-small text-muted">[LOADING]</span>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="font-small text-accent">NODE NOT FOUND</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="font-button text-primary">THE CONSOLE</span>
          <StatusBadge status={node.status} />
          <span className="font-button text-muted text-xs">
            {node.contentType.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-small text-muted">
            {node.wordCount ?? 0} WORDS
          </span>
          {saving && <span className="font-small text-primary">SAVING...</span>}
          {node.status === 'ready' && (
            <a
              href={`/content/${id}/assets`}
              className="border border-primary text-primary font-button text-xs px-3 py-1 hover:bg-primary hover:text-background transition-colors"
            >
              ASSEMBLY LINE
            </a>
          )}
          {node.status === 'draft' && (
            <button
              onClick={handleProcess}
              disabled={processing}
              className="border border-primary bg-primary text-background font-button text-xs px-3 py-1 hover:bg-transparent hover:text-primary transition-colors disabled:opacity-50"
            >
              {processing ? 'PROCESSING...' : 'PROCESS'}
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 py-3 border-b border-border">
        <h1 className="font-heading text-foreground">{node.title}</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor / Source */}
        <div className="flex-1 flex flex-col border-r border-border">
          {node.contentType === 'blog' ? (
            <TipTapEditor
              content={node.bodyHtml ?? ''}
              onChange={handleSave}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              {node.sourceUrl && (
                <div className="p-4 border-b border-border">
                  {node.contentType === 'video' ? (
                    <video
                      src={node.sourceUrl}
                      controls
                      className="w-full max-h-[400px] bg-background"
                    />
                  ) : (
                    <audio
                      src={node.sourceUrl}
                      controls
                      className="w-full"
                    />
                  )}
                </div>
              )}
              {/* Transcript display */}
              {node.bodyText && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="font-small text-muted mb-2">TRANSCRIPT</div>
                  <p className="text-foreground whitespace-pre-wrap">{node.bodyText}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Segments Panel */}
        <div className="w-[380px] flex flex-col">
          <div className="px-4 py-2 border-b border-border">
            <span className="font-button text-muted text-xs">
              SEGMENTS ({node.segments?.length ?? 0})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(!node.segments || node.segments.length === 0) ? (
              <div className="p-4 font-small text-muted">
                {node.status === 'draft'
                  ? 'AWAITING PROCESSING'
                  : node.status === 'processing'
                  ? 'DECOMPOSING...'
                  : 'NO SEGMENTS'}
              </div>
            ) : (
              node.segments.map((seg) => (
                <div
                  key={seg.id}
                  className="px-4 py-3 border-b border-border hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-button text-[10px] text-primary border border-primary px-1">
                      {seg.segmentType.toUpperCase()}
                    </span>
                    {seg.confidence != null && (
                      <span className="font-small text-muted">
                        {(seg.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {seg.startMs != null && seg.endMs != null && (
                      <span className="font-data text-muted text-xs">
                        {formatTime(seg.startMs)}–{formatTime(seg.endMs)}
                      </span>
                    )}
                  </div>
                  {seg.title && (
                    <div className="text-foreground text-sm font-medium mb-1">
                      {seg.title}
                    </div>
                  )}
                  <p className="text-muted text-sm line-clamp-3">{seg.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins}:${s.toString().padStart(2, '0')}`;
}
