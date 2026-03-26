// @crumb youtube-player-wrapper
// [UI] | YouTube embed | Media player
// why: Integrates YouTube IFrame API with React—handles player events and timeline sync
// in:[videoId, currentTime, playback state] out:[player DOM, event callbacks] err:[API load, embed errors]
// hazard: YouTube IFrame API loaded asynchronously—race condition if used before fully loaded
// hazard: No error recovery if YouTube CDN unavailable—player fails to initialize silently
// edge:apps/studio/src/components/console/MasterTimecode.tsx -> CALLS
// prompt: Add API load state check before calling methods, implement CDN fallback detection

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { extractYouTubeId } from '@/lib/services/video-source-resolver';

interface YouTubePlayerProps {
  sourceUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onReady?: () => void;
  seekTo?: number | null;
}

// Extend window for YouTube API
declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: Record<string, (event: { target: YTPlayer }) => void>;
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
  destroy: () => void;
}

export function YouTubePlayer({
  sourceUrl,
  onTimeUpdate,
  onDurationChange,
  onReady,
  seekTo,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [apiReady, setApiReady] = useState(false);

  const videoId = extractYouTubeId(sourceUrl);

  // Load YouTube iframe API script
  useEffect(() => {
    if (window.YT) {
      setApiReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existingScript) {
      // Script loading, wait for callback
      const original = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        original?.();
        setApiReady(true);
      };
      return;
    }

    window.onYouTubeIframeAPIReady = () => setApiReady(true);

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!apiReady || !videoId || !containerRef.current) return;

    // Clear existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Create a div for the player
    const playerDiv = document.createElement('div');
    playerDiv.id = `yt-player-${videoId}`;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(playerDiv);

    playerRef.current = new window.YT.Player(playerDiv, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: { target: YTPlayer }) => {
          const duration = event.target.getDuration();
          onDurationChange?.(duration);
          onReady?.();

          // Start time polling
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            if (playerRef.current) {
              const time = playerRef.current.getCurrentTime();
              onTimeUpdate?.(time);
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
  }, [apiReady, videoId]); // onTimeUpdate, onDurationChange, onReady intentionally excluded — only re-init on source change

  // Handle seek commands
  useEffect(() => {
    if (seekTo != null && playerRef.current) {
      playerRef.current.seekTo(seekTo, true);
    }
  }, [seekTo]);

  // Expose toggle for keyboard control
  const handleClick = useCallback(() => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === 1) { // PLAYING
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, []);

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <span className="font-mono text-accent text-sm tracking-widest">
          [INVALID YOUTUBE URL]
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="w-full h-full bg-black border border-border flex items-center justify-center"
      style={{ minHeight: '300px' }}
    >
      {!apiReady && (
        <span className="font-mono text-muted text-sm tracking-widest blink">
          LOADING YOUTUBE...
        </span>
      )}
    </div>
  );
}
