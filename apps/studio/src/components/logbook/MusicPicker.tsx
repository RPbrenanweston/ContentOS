'use client';

export interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  durationSeconds: number;
  previewUrl: string | null;
  attribution: string;
}

interface MusicPickerProps {
  selectedTrackId: string | null;
  onSelect: (trackId: string | null) => void;
}

const TRACK_CATALOG: Record<string, MusicTrack[]> = {
  INTENSE: [
    {
      id: 'intense-01',
      name: 'BATTLE DRUMS',
      mood: 'INTENSE',
      durationSeconds: 180,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
    {
      id: 'intense-02',
      name: 'ADRENALINE SURGE',
      mood: 'INTENSE',
      durationSeconds: 150,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
    {
      id: 'intense-03',
      name: 'PRESSURE DROP',
      mood: 'INTENSE',
      durationSeconds: 200,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
  ],
  CINEMATIC: [
    {
      id: 'cine-01',
      name: 'DARK CINEMATIC',
      mood: 'CINEMATIC',
      durationSeconds: 240,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
    {
      id: 'cine-02',
      name: 'EPIC TENSION',
      mood: 'CINEMATIC',
      durationSeconds: 210,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
    {
      id: 'cine-03',
      name: 'RISING STAKES',
      mood: 'CINEMATIC',
      durationSeconds: 195,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
  ],
  MINIMAL: [
    {
      id: 'min-01',
      name: 'LO-FI ANALYSIS',
      mood: 'MINIMAL',
      durationSeconds: 300,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
    {
      id: 'min-02',
      name: 'QUIET FOCUS',
      mood: 'MINIMAL',
      durationSeconds: 270,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
  ],
  'HIP-HOP': [
    {
      id: 'hh-01',
      name: 'HIGHLIGHT REEL',
      mood: 'HIP-HOP',
      durationSeconds: 165,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
    {
      id: 'hh-02',
      name: 'KNOCKOUT BOUNCE',
      mood: 'HIP-HOP',
      durationSeconds: 180,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
    {
      id: 'hh-03',
      name: 'WALKOUT ANTHEM',
      mood: 'HIP-HOP',
      durationSeconds: 200,
      previewUrl: null,
      attribution: 'Royalty-free placeholder',
    },
  ],
};

const MOOD_DESCRIPTIONS: Record<string, string> = {
  INTENSE: 'For fight breakdowns',
  CINEMATIC: 'For analysis',
  MINIMAL: 'For commentary-focused',
  'HIP-HOP': 'For highlights',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MusicPicker({ selectedTrackId, onSelect }: MusicPickerProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <span className="font-heading font-bold text-[10px] uppercase tracking-[0.2em] text-muted block">
        BACKGROUND MUSIC
      </span>

      {/* Mood categories */}
      {Object.entries(TRACK_CATALOG).map(([mood, tracks]) => (
        <div key={mood} className="space-y-1">
          {/* Category header */}
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-xs text-text uppercase tracking-wider">
              {mood}
            </span>
            <span className="font-mono text-[10px] text-muted">
              {MOOD_DESCRIPTIONS[mood]}
            </span>
          </div>

          {/* Tracks */}
          {tracks.map((track) => {
            const isSelected = selectedTrackId === track.id;
            return (
              <div
                key={track.id}
                className={`
                  flex items-center justify-between px-3 py-2 border
                  ${isSelected
                    ? 'border-l-2 border-l-primary border-t-border border-r-border border-b-border bg-primary/5'
                    : 'border-border'
                  }
                `}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs ${isSelected ? 'text-primary' : 'text-text'}`}>
                      {track.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted tabular-nums">
                      {formatDuration(track.durationSeconds)}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-muted/60">
                    {track.attribution}
                  </span>
                </div>

                <button
                  onClick={() => onSelect(isSelected ? null : track.id)}
                  className={`
                    px-3 py-1 border font-mono text-[10px] uppercase tracking-wider shrink-0
                    ${isSelected
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted hover:border-text hover:text-text'
                    }
                  `}
                >
                  {isSelected ? '[SELECTED]' : '[SELECT]'}
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {/* NONE option */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-xs text-text uppercase tracking-wider">
            NONE
          </span>
          <span className="font-mono text-[10px] text-muted">
            Removes music
          </span>
        </div>
        <div
          className={`
            flex items-center justify-between px-3 py-2 border
            ${selectedTrackId === null
              ? 'border-l-2 border-l-primary border-t-border border-r-border border-b-border bg-primary/5'
              : 'border-border'
            }
          `}
        >
          <span className={`font-mono text-xs ${selectedTrackId === null ? 'text-primary' : 'text-muted'}`}>
            NO BACKGROUND MUSIC
          </span>
          <button
            onClick={() => onSelect(null)}
            className={`
              px-3 py-1 border font-mono text-[10px] uppercase tracking-wider shrink-0
              ${selectedTrackId === null
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted hover:border-text hover:text-text'
              }
            `}
          >
            {selectedTrackId === null ? '[SELECTED]' : '[SELECT]'}
          </button>
        </div>
      </div>

      {/* Footer notice */}
      <div className="pt-2 border-t border-border">
        <span className="font-mono text-[9px] text-muted/60 uppercase tracking-widest">
          All tracks are royalty-free for commercial use
        </span>
      </div>
    </div>
  );
}
