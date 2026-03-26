// @crumb use-voice-input
// UI | Voice input | Speech recognition | Hook abstraction
// why: React hook abstracting browser SpeechRecognition API with roadmap to FreeFlow upgrade (streaming transcription + polishing)
// in:[provider='browser', language='en-GB', onTranscript, onInterim callbacks] out:[{isRecording, start, stop, toggle, interimText}] err:[SpeechRecognition unavailable, browser unsupported]
// hazard: Browser SpeechRecognition has no timeout—user can record forever without triggering stop, consuming memory
// hazard: FreeFlow WebSocket code commented out but no documentation on upgrade path—future developers may skip Phase 2 implementation
// edge:../../domain/content-node.ts -> WRITES [voice transcripts become contentNode.bodyText]
// edge:../editor/tiptap-editor.tsx -> SERVES [voice input could feed editor content]
// prompt: Add max recording duration (e.g. 5min) with auto-stop. Document FreeFlow Phase 2 requirements (gpt-4.1-nano, API keys). Test interimResults batching behavior.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceProvider = 'browser' | 'freeflow';

interface UseVoiceInputOptions {
  provider?: VoiceProvider;
  /** FreeFlow server URL (for future upgrade) */
  freeflowUrl?: string;
  /** Language code */
  language?: string;
  /** Called with final transcript text */
  onTranscript: (text: string) => void;
  /** Called with interim (partial) transcript */
  onInterim?: (text: string) => void;
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  interimText: string;
}

/**
 * Voice input hook — abstracts speech-to-text provider.
 *
 * Phase 1: Browser SpeechRecognition API (free, built-in)
 * Phase 2: FreeFlow WebSocket (OpenAI Realtime + polish pipeline)
 *
 * Architecture from: https://github.com/RPbrenanweston/freeflowforcontentOS
 * FreeFlow uses:
 *   - OpenAI Realtime API (gpt-4o-realtime-preview) for streaming transcription
 *   - gpt-4.1-nano for text polishing (filler removal, formatting)
 *   - WebSocket at /stream for real-time audio streaming
 *   - POST /dictate for batch mode
 *   - 0.57s median latency, ~$0.007/dictation
 */
export function useVoiceInput({
  provider = 'browser',
  language = 'en-GB',
  onTranscript,
  onInterim,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const start = useCallback(() => {
    if (!isSupported || isRecording) return;

    if (provider === 'browser') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
          onInterim?.(interim);
        }

        if (final) {
          setInterimText('');
          onTranscript(final);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }

    // Phase 2: FreeFlow WebSocket provider
    // if (provider === 'freeflow') {
    //   const ws = new WebSocket(`${freeflowUrl}/stream`);
    //   ws.onopen = () => {
    //     ws.send(JSON.stringify({ type: 'start', context: {}, language }));
    //     // Start MediaRecorder, send audio chunks as base64
    //   };
    //   ws.onmessage = (event) => {
    //     const data = JSON.parse(event.data);
    //     if (data.type === 'transcript_done') {
    //       onTranscript(data.text); // Polished text from FreeFlow
    //     }
    //   };
    // }
  }, [isSupported, isRecording, provider, language, onTranscript, onInterim]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else start();
  }, [isRecording, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { isRecording, isSupported, start, stop, toggle, interimText };
}

// Type augmentation for browser SpeechRecognition
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
