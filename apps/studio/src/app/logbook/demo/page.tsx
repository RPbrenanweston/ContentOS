// @crumb logbook-demo-page
// [UI] | Demo ledger | Read-only annotations
// why: Demo mode for logbook editor—shows sample markers, clips, and annotations
// in:[demo video, sample markers] out:[demo logbook UI, disabled editing] err:[state errors]
// hazard: Sample markers hard-coded—may not match actual workflow if marker types change
// hazard: No visual distinction between demo and live logbook—users may get confused
// edge:apps/studio/src/app/logbook/[videoId]/page.tsx -> RELATES
// prompt: Add demo mode badge, separate demo state from live logbook, document demo limitations

// @crumb logbook-demo-page
// [UI] | Demo ledger | Read-only annotations
// why: Demo mode for logbook editor—shows sample markers, clips, and annotations
// in:[demo video, sample markers] out:[demo logbook UI, disabled editing] err:[state errors]
// hazard: Sample markers hard-coded—may not match actual workflow if marker types change
// hazard: No visual distinction between demo and live logbook—users may get confused
// edge:apps/studio/src/app/logbook/\[videoId\]/page.tsx -> RELATES
// prompt: Add demo mode badge, separate demo state from live logbook, document demo limitations

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogbookLayout } from '@/components/logbook/LogbookLayout';
import { VideoViewport } from '@/components/console/VideoViewport';
import { CleanYouTubePlayer } from '@/components/console/CleanYouTubePlayer';
import { MasterTimecode } from '@/components/console/MasterTimecode';
import { WaveformTimeline } from '@/components/console/WaveformTimeline';
import { LedgerPanel } from '@/components/logbook/LedgerPanel';
import { RecordButton } from '@/components/logbook/RecordButton';
import { DrawingToolbar } from '@/components/logbook/DrawingToolbar';
import { ClipTrimmer } from '@/components/logbook/ClipTrimmer';
import { AudioMixer } from '@/components/logbook/AudioMixer';
import { TextOverlayEditor } from '@/components/logbook/TextOverlayEditor';
import { VideoTextRenderer, type TextBlock } from '@/components/logbook/VideoTextRenderer';
import { MusicPicker } from '@/components/logbook/MusicPicker';
import { type DrawingTool } from '@/components/logbook/DrawingCanvas';
import { useDemoState } from '@/lib/hooks/useDemoState';
import { useScreenRecorder } from '@/lib/hooks/useScreenRecorder';
import { formatTimecode } from '@/lib/utils/time';
import type { Breadcrumb } from '@/lib/types/domain';

export const dynamic = 'force-dynamic';

export default function DemoLogbookPage() {
  const router = useRouter();
  const {
    youtubeUrl,
    breadcrumbs,
    duration,
    updateBreadcrumb,
    deleteBreadcrumb,
    addRecording,
    getRecording,
  } = useDemoState();

  const { recording, error: recError, startRecording, stopRecording } = useScreenRecorder({
    includeAudio: true,
    includeTabAudio: true,
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [activeBreadcrumbId, setActiveBreadcrumbId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [recordingForBreadcrumb, setRecordingForBreadcrumb] = useState<string | null>(null);
  const [drawingTool, setDrawingTool] = useState<DrawingTool | null>(null);

  // Editing state
  const [editTab, setEditTab] = useState<'markers' | 'edit'>('markers');
  const [originalMuted, setOriginalMuted] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [clipPlaybackTime, setClipPlaybackTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const captureContainerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Array<{ points: { x: number; y: number }[]; tool: DrawingTool; color: string; lineWidth: number }>>([]);
  const [strokeCount, setStrokeCount] = useState(0);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ points: { x: number; y: number }[]; tool: DrawingTool; color: string; lineWidth: number } | null>(null);

  // Resize canvas to match container
  useEffect(() => {
    if (!expanded || !captureContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(captureContainerRef.current);
    return () => observer.disconnect();
  }, [expanded]);

  // Canvas drawing functions
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      drawStrokeOnCtx(ctx, stroke);
    }
    if (currentStrokeRef.current) {
      drawStrokeOnCtx(ctx, currentStrokeRef.current);
    }
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingTool) return;
    e.preventDefault();
    e.stopPropagation();
    isDrawingRef.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = {
      x: ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height,
    };
    currentStrokeRef.current = { points: [point], tool: drawingTool, color: '#D4F85A', lineWidth: 3 };
  }, [drawingTool]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    currentStrokeRef.current.points.push({
      x: ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height,
    });
    redrawCanvas();
  }, [redrawCanvas]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    strokesRef.current.push(currentStrokeRef.current);
    currentStrokeRef.current = null;
    isDrawingRef.current = false;
    setStrokeCount(strokesRef.current.length);
    redrawCanvas();
  }, [redrawCanvas]);

  const handleClearDrawings = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setStrokeCount(0);
    redrawCanvas();
  }, [redrawCanvas]);

  const handleUndoDrawing = useCallback(() => {
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redrawCanvas();
  }, [redrawCanvas]);

  const handleSeek = useCallback((seconds: number) => {
    setSeekTarget(seconds);
    setCurrentTime(seconds);
    setTimeout(() => setSeekTarget(null), 50);
  }, []);

  const handleSelectBreadcrumb = useCallback((bc: Breadcrumb) => {
    setActiveBreadcrumbId(bc.id);
    handleSeek(bc.startTimeSeconds);
  }, [handleSeek]);

  const handleStartRecording = useCallback(async () => {
    if (!activeBreadcrumbId) return;
    setRecordingForBreadcrumb(activeBreadcrumbId);
    await startRecording();
  }, [activeBreadcrumbId, startRecording]);

  const handleStopRecording = useCallback(async () => {
    const result = await stopRecording();
    if (result && recordingForBreadcrumb) {
      addRecording(recordingForBreadcrumb, result);
    }
    setRecordingForBreadcrumb(null);
  }, [stopRecording, recordingForBreadcrumb, addRecording]);

  if (!youtubeUrl) {
    if (typeof window !== 'undefined') router.push('/console');
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <span className="font-mono text-muted text-sm tracking-widest blink">REDIRECTING...</span>
      </div>
    );
  }

  // Expanded capture view — clean video + drawing canvas only
  if (expanded) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
        {/* Control bar — NOT captured (above the capture area) */}
        <div className={`
          flex items-center justify-between px-4 py-2 bg-background border-b border-border
          transition-opacity duration-200
          ${recording ? 'opacity-40' : 'opacity-100'}
        `}>
          <div className="flex items-center gap-4">
            <span className="font-heading font-bold text-xs text-primary tracking-[0.2em]">
              CAPTURE
            </span>
            <span className="font-mono text-sm text-primary tabular-nums">
              {formatTimecode(currentTime)}
            </span>
            {strokeCount > 0 && (
              <span className="font-mono text-[10px] text-muted">
                {strokeCount} ANNOTATION{strokeCount !== 1 ? 'S' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DrawingToolbar
              activeTool={drawingTool}
              onSelectTool={setDrawingTool}
              onClear={handleClearDrawings}
              onUndo={handleUndoDrawing}
            />
            <div className="w-px h-6 bg-border mx-2" />
            <RecordButton
              recording={recording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              disabled={!activeBreadcrumbId}
            />
            <button
              onClick={() => { setExpanded(false); setDrawingTool(null); }}
              className="px-3 py-1.5 border border-border font-heading text-[11px] uppercase tracking-wider text-muted hover:text-text transition-colors"
            >
              [EXIT]
            </button>
          </div>
        </div>

        {/* Capture area — THIS is what gets recorded */}
        {/* Clean video player + transparent drawing canvas, nothing else */}
        <div
          ref={captureContainerRef}
          className="flex-1 relative bg-black"
        >
          {/* Clean YouTube player — controls hidden during recording */}
          <CleanYouTubePlayer
            sourceUrl={youtubeUrl}
            onTimeUpdate={setCurrentTime}
            onDurationChange={() => {}}
            seekTo={seekTarget}
            hideControls={recording}
          />

          {/* Drawing canvas overlay — transparent, captures annotations */}
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className={`absolute inset-0 z-10 ${drawingTool ? 'cursor-crosshair' : 'pointer-events-none'}`}
            style={{ width: '100%', height: '100%' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
      </div>
    );
  }

  // Normal Logbook layout
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center gap-0 border-b border-border bg-background">
        <div className="px-4 py-2 border-r border-border">
          <span className="font-heading font-bold text-xs text-primary tracking-[0.2em]">
            BREADCRUMB
          </span>
        </div>
        <button
          onClick={() => router.push(`/console/demo?youtube=${encodeURIComponent(youtubeUrl)}`)}
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-muted hover:text-text transition-colors"
        >
          CONSOLE
        </button>
        <button
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-primary bg-surface"
        >
          LOGBOOK ({breadcrumbs.length})
        </button>
        <button
          onClick={() => router.push('/assembly/demo')}
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-muted hover:text-text transition-colors"
        >
          ASSEMBLY
        </button>
        <button
          onClick={() => router.push('/archive')}
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-muted hover:text-text transition-colors"
        >
          ARCHIVE
        </button>

        {/* Recording controls in nav */}
        <div className="ml-auto flex items-center gap-3 px-4">
          <RecordButton
            recording={recording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            disabled={!activeBreadcrumbId}
          />
          <button
            onClick={() => setExpanded(true)}
            className="px-3 py-1.5 border border-border font-heading text-[11px] uppercase tracking-wider text-muted hover:text-primary hover:border-primary transition-colors"
          >
            [EXPAND]
          </button>
        </div>
      </nav>

      {recError && (
        <div className="px-4 py-2 bg-accent/10 border-b border-accent/30">
          <span className="font-mono text-xs text-accent">[{recError}]</span>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <LogbookLayout
          videoSection={
            <div className="flex flex-col h-full">
              <div className="relative flex-1 min-h-0">
                <VideoViewport
                  sourceType="youtube"
                  fileUrl={null}
                  sourceUrl={youtubeUrl}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={() => {}}
                  seekTo={seekTarget}
                />
                <MasterTimecode currentSeconds={currentTime} />
                <VideoTextRenderer textBlocks={textBlocks} currentTime={currentTime} />

                {recording && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-accent/90 px-3 py-1.5">
                    <div className="w-2 h-2 bg-white animate-pulse" />
                    <span className="font-mono text-[11px] text-white font-bold tracking-wider">
                      REC
                    </span>
                  </div>
                )}
              </div>
              <div className="h-[80px] border-t border-border bg-surface">
                <WaveformTimeline
                  durationSeconds={duration ?? 0}
                  currentTime={currentTime}
                  breadcrumbs={breadcrumbs}
                  onSeek={handleSeek}
                  onMarkerClick={(bc) => handleSelectBreadcrumb(bc as Breadcrumb)}
                />
              </div>
            </div>
          }
          ledgerPanel={
            <div className="flex flex-col h-full">
              {/* Tab bar */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setEditTab('markers')}
                  className={`flex-1 px-4 py-2 font-heading font-semibold text-[11px] uppercase tracking-[0.15em] transition-colors ${
                    editTab === 'markers' ? 'text-primary bg-surface' : 'text-muted hover:text-text'
                  }`}
                >
                  MARKERS ({breadcrumbs.length})
                </button>
                <button
                  onClick={() => setEditTab('edit')}
                  className={`flex-1 px-4 py-2 font-heading font-semibold text-[11px] uppercase tracking-[0.15em] transition-colors border-l border-border ${
                    editTab === 'edit' ? 'text-primary bg-surface' : 'text-muted hover:text-text'
                  }`}
                >
                  EDIT CLIP
                </button>
              </div>

              {editTab === 'markers' ? (
                /* Markers tab — original ledger */
                <LedgerPanel
                  breadcrumbs={breadcrumbs}
                  activeBreadcrumbId={activeBreadcrumbId}
                  onSelect={(bc) => { handleSelectBreadcrumb(bc); setEditTab('edit'); }}
                  onUpdate={updateBreadcrumb}
                  onDelete={deleteBreadcrumb}
                />
              ) : (
                /* Edit tab — trimmer, audio, text, music */
                <div className="flex-1 overflow-y-auto">
                  {activeBreadcrumbId && (() => {
                    const activeBc = breadcrumbs.find((b) => b.id === activeBreadcrumbId);
                    const activeRec = activeBreadcrumbId ? getRecording(activeBreadcrumbId) : undefined;
                    if (!activeBc) return (
                      <div className="p-4 flex items-center justify-center h-full">
                        <span className="font-mono text-muted text-sm">SELECT A MARKER FIRST</span>
                      </div>
                    );
                    return (
                      <div className="divide-y divide-border">
                        {/* Recording preview / status */}
                        <div className="p-4">
                          <span className="font-heading font-bold text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                            CLIP PREVIEW
                          </span>
                          {activeRec ? (
                            <video
                              src={activeRec.url}
                              controls
                              onTimeUpdate={(e) => setClipPlaybackTime((e.target as HTMLVideoElement).currentTime)}
                              className="w-full aspect-video bg-black border border-border"
                              muted={originalMuted}
                            />
                          ) : (
                            <div className="w-full aspect-video bg-surface border border-border flex items-center justify-center">
                              <span className="font-mono text-xs text-muted">
                                NO RECORDING — USE [EXPAND] → [REC] TO CAPTURE
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Trimmer */}
                        {activeRec && (
                          <div className="p-4">
                            <span className="font-heading font-bold text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                              TRIM
                            </span>
                            <ClipTrimmer
                              durationSeconds={activeRec.durationSeconds}
                              startTime={activeBc.startTimeSeconds}
                              endTime={activeBc.endTimeSeconds}
                              currentTime={clipPlaybackTime}
                              onTrimChange={(start, end) => {
                                updateBreadcrumb(activeBc.id, { startTimeSeconds: start, endTimeSeconds: end });
                              }}
                              onSeek={(t) => {
                                const vid = document.querySelector('.edit-preview video') as HTMLVideoElement;
                                if (vid) vid.currentTime = t;
                              }}
                            />
                          </div>
                        )}

                        {/* Audio mixer */}
                        <div className="p-4">
                          <AudioMixer
                            originalMuted={originalMuted}
                            onToggleOriginal={() => setOriginalMuted(!originalMuted)}
                            micEnabled={micEnabled}
                            onToggleMic={() => setMicEnabled(!micEnabled)}
                            musicVolume={musicVolume}
                            onMusicVolumeChange={setMusicVolume}
                            hasMusic={!!selectedMusicId}
                          />
                        </div>

                        {/* Text overlay editor */}
                        <div className="p-4">
                          <span className="font-heading font-bold text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                            TEXT OVERLAYS
                          </span>
                          <TextOverlayEditor
                            textBlocks={textBlocks}
                            onChange={setTextBlocks}
                            currentTime={clipPlaybackTime}
                            durationSeconds={activeRec?.durationSeconds ?? activeBc.endTimeSeconds - activeBc.startTimeSeconds}
                          />
                        </div>

                        {/* Music picker */}
                        <div className="p-4">
                          <MusicPicker
                            selectedTrackId={selectedMusicId}
                            onSelect={setSelectedMusicId}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {!activeBreadcrumbId && (
                    <div className="p-4 flex items-center justify-center h-full">
                      <span className="font-mono text-muted text-sm">SELECT A MARKER TO EDIT</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}

// Canvas drawing helper
function drawStrokeOnCtx(
  ctx: CanvasRenderingContext2D,
  stroke: { points: { x: number; y: number }[]; tool: string; color: string; lineWidth: number }
) {
  if (stroke.points.length === 0) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = 6;

  if (stroke.tool === 'pen') {
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  } else if (stroke.tool === 'circle') {
    if (stroke.points.length < 2) return;
    const s = stroke.points[0];
    const e = stroke.points[stroke.points.length - 1];
    ctx.beginPath();
    ctx.ellipse((s.x + e.x) / 2, (s.y + e.y) / 2, Math.abs(e.x - s.x) / 2, Math.abs(e.y - s.y) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (stroke.tool === 'arrow') {
    if (stroke.points.length < 2) return;
    const s = stroke.points[0];
    const e = stroke.points[stroke.points.length - 1];
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    const angle = Math.atan2(e.y - s.y, e.x - s.x);
    const hl = 15;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - hl * Math.cos(angle - Math.PI / 6), e.y - hl * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - hl * Math.cos(angle + Math.PI / 6), e.y - hl * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}
