'use client';

import { useEffect, useRef, useState } from 'react';
import { extractYouTubeId } from '@/lib/services/video-source-resolver';

interface CleanYouTubePlayerProps {
  sourceUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onReady?: () => void;
  seekTo?: number | null;
  hideControls?: boolean;
}

// Player interface — same as YTPlayer but with getIframe
interface CleanYTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

// Cast the YT.Player constructor result to our extended interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPlayer(el: HTMLElement, config: any): CleanYTPlayer {
  return new window.YT.Player(el, config) as unknown as CleanYTPlayer;
}

/**
 * Clean YouTube player — minimal chrome, optimized for screen capture.
 * Uses controls=0, showinfo=0, modestbranding=1 to hide YouTube UI.
 * Player fills entire container.
 */
export function CleanYouTubePlayer({
  sourceUrl,
  onTimeUpdate,
  onDurationChange,
  onReady,
  seekTo,
  hideControls = false,
}: CleanYouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<CleanYTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [apiReady, setApiReady] = useState(false);

  const videoId = extractYouTubeId(sourceUrl);

  // Load YouTube API
  useEffect(() => {
    if (window.YT) {
      setApiReady(true);
      return;
    }
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existing) {
      const orig = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { orig?.(); setApiReady(true); };
      return;
    }
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Init player
  useEffect(() => {
    if (!apiReady || !videoId || !containerRef.current) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const playerDiv = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(playerDiv);

    playerRef.current = createPlayer(playerDiv, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: hideControls ? 0 : 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        disablekb: 0,
        fs: 0,
        enablejsapi: 1,
        origin: window.location.origin,
        playsinline: 1,
      },
      events: {
        onReady: (event: { target: CleanYTPlayer }) => {
          const duration = event.target.getDuration();
          onDurationChange?.(duration);
          onReady?.();

          // Make iframe fill container
          const iframe = event.target.getIframe();
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';

          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            if (playerRef.current) {
              onTimeUpdate?.(playerRef.current.getCurrentTime());
            }
          }, 250);
        },
      },
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [apiReady, videoId, hideControls]); // onTimeUpdate, onDurationChange, onReady excluded — only re-init on source/controls change

  // Seek
  useEffect(() => {
    if (seekTo != null && playerRef.current) {
      playerRef.current.seekTo(seekTo, true);
    }
  }, [seekTo]);

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <span className="font-mono text-accent text-sm">[INVALID URL]</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
    >
      {!apiReady && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="font-mono text-muted text-sm tracking-widest blink">LOADING...</span>
        </div>
      )}
    </div>
  );
}

// Play/pause from outside
export function toggleYouTubePlayback(playerRef: { current: CleanYTPlayer | null }) {
  if (!playerRef.current) return;
  const state = playerRef.current.getPlayerState();
  if (state === 1) playerRef.current.pauseVideo();
  else playerRef.current.playVideo();
}
