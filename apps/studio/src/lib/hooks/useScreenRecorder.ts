// @crumb use-screen-recorder
// [UI] | Screen capture handler | Recording control
// why: Hook managing screen recording state and MediaRecorder API integration
// in:[isRecording state, onDataAvailable callback] out:[recorded blob, recording state] err:[media, API errors]
// hazard: No codec negotiation—may fail on browsers without expected codec support
// hazard: MediaRecorder state not validated—may attempt to start/stop in invalid states
// edge:apps/studio/src/components/logbook/RecordButton.tsx -> CALLS
// prompt: Add codec detection and fallback, implement state machine for valid transitions

'use client';

import { useState, useRef, useCallback } from 'react';

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  timestamp: number;
}

interface UseScreenRecorderOptions {
  includeAudio?: boolean;      // Capture microphone for commentary
  includeTabAudio?: boolean;   // Capture tab audio (video sound)
}

export function useScreenRecorder(options: UseScreenRecorderOptions = {}) {
  const { includeAudio = true, includeTabAudio = true } = options;

  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const streamsRef = useRef<MediaStream[]>([]);

  const startRecording = useCallback(async (): Promise<void> => {
    setError(null);
    chunksRef.current = [];

    try {
      // Capture the current tab
      const displayMediaOptions: DisplayMediaStreamOptions & Record<string, unknown> = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: includeTabAudio,
      };
      // Chrome-specific: prefer capturing current tab
      displayMediaOptions.preferCurrentTab = true;

      const displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      streamsRef.current = [displayStream];
      const tracks: MediaStreamTrack[] = [...displayStream.getVideoTracks()];

      // Add tab audio if available
      const tabAudioTracks = displayStream.getAudioTracks();
      if (tabAudioTracks.length > 0) {
        tracks.push(...tabAudioTracks);
      }

      // Capture microphone for commentary
      if (includeAudio) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          streamsRef.current.push(micStream);
          tracks.push(...micStream.getAudioTracks());
        } catch {
          // Mic unavailable — continue without commentary audio
          console.warn('Microphone not available, recording without commentary');
        }
      }

      // Combine all tracks
      const combinedStream = new MediaStream(tracks);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Stop when user stops sharing
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start(1000); // Collect data every second
      setRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      cleanup();
    }
  }, [includeAudio, includeTabAudio]);

  const stopRecording = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        resolve(null);
        setRecording(false);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        const durationSeconds = (Date.now() - startTimeRef.current) / 1000;

        cleanup();
        setRecording(false);

        resolve({
          blob,
          url,
          durationSeconds,
          timestamp: startTimeRef.current,
        });
      };

      recorder.stop();
    });
  }, []);

  const cleanup = useCallback(() => {
    streamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    streamsRef.current = [];
    mediaRecorderRef.current = null;
  }, []);

  return {
    recording,
    error,
    startRecording,
    stopRecording,
  };
}
