// @crumb text-overlay-editor
// [UI] | Text placement | Overlay controls
// why: Editor for adding and positioning text overlays on video—controls placement and styling
// in:[text content, position, size, font, color] out:[overlay DOM, text styling] err:[render, input errors]
// hazard: Text position not constrained—overlays may render outside video bounds
// hazard: Font size not bounded—very large text may overflow container
// edge:apps/studio/src/components/logbook/VideoTextRenderer.tsx -> SERVES
// prompt: Add boundary constraints for positioning, bound font sizes, implement text preview

'use client';

import { useCallback } from 'react';

export interface TextBlock {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  position: 'top' | 'center' | 'bottom';
  style: 'caption' | 'title' | 'callout';
  fontSize: 'sm' | 'md' | 'lg';
}

interface TextOverlayEditorProps {
  textBlocks: TextBlock[];
  onChange: (blocks: TextBlock[]) => void;
  currentTime: number;
  durationSeconds: number;
}

const POSITION_OPTIONS: { value: TextBlock['position']; label: string }[] = [
  { value: 'top', label: 'TOP' },
  { value: 'center', label: 'MID' },
  { value: 'bottom', label: 'BTM' },
];

const STYLE_OPTIONS: { value: TextBlock['style']; label: string }[] = [
  { value: 'caption', label: 'CAPTION' },
  { value: 'title', label: 'TITLE' },
  { value: 'callout', label: 'CALLOUT' },
];

const FONT_SIZE_OPTIONS: { value: TextBlock['fontSize']; label: string }[] = [
  { value: 'sm', label: 'SM' },
  { value: 'md', label: 'MD' },
  { value: 'lg', label: 'LG' },
];

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function generateId(): string {
  return `txt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function TextOverlayEditor({
  textBlocks,
  onChange,
  currentTime,
  durationSeconds,
}: TextOverlayEditorProps) {
  const isActive = useCallback(
    (block: TextBlock) => currentTime >= block.startTime && currentTime <= block.endTime,
    [currentTime]
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<TextBlock>) => {
      onChange(
        textBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
    },
    [textBlocks, onChange]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      onChange(textBlocks.filter((b) => b.id !== id));
    },
    [textBlocks, onChange]
  );

  const addBlock = useCallback(() => {
    const startTime = currentTime;
    const endTime = Math.min(currentTime + 5, durationSeconds);
    const newBlock: TextBlock = {
      id: generateId(),
      text: '',
      startTime,
      endTime,
      position: 'bottom',
      style: 'caption',
      fontSize: 'md',
    };
    onChange([...textBlocks, newBlock]);
  }, [currentTime, durationSeconds, textBlocks, onChange]);

  return (
    <div className="flex flex-col gap-0 border border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-heading text-xs uppercase tracking-wider text-muted">
          Text Overlays
        </span>
        <span className="font-mono text-[10px] text-muted tabular-nums">
          {textBlocks.length} block{textBlocks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Block list */}
      {textBlocks.map((block) => {
        const active = isActive(block);
        return (
          <div
            key={block.id}
            className={`
              relative border-b border-border/50 transition-colors
              ${active ? 'bg-[#2E312C]' : 'bg-background'}
            `}
          >
            {/* Active indicator */}
            {active && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
            )}

            <div className="px-4 py-3 pl-5 flex flex-col gap-2">
              {/* Text input */}
              <input
                type="text"
                value={block.text}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                placeholder="Enter overlay text..."
                className="
                  w-full bg-transparent text-text font-mono text-sm
                  border-0 border-b border-transparent
                  focus:border-b focus:border-primary focus:outline-none
                  placeholder:text-muted/50
                  py-1
                "
              />

              {/* Timecodes */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-primary tabular-nums">
                  {formatMMSS(block.startTime)}
                </span>
                <span className="font-mono text-xs text-muted">—</span>
                <span className="font-mono text-sm text-primary tabular-nums">
                  {formatMMSS(block.endTime)}
                </span>
              </div>

              {/* Position selector */}
              <div className="flex items-center gap-1">
                {POSITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateBlock(block.id, { position: opt.value })}
                    className={`
                      font-heading text-[11px] uppercase tracking-wider px-2 py-1
                      border border-border transition-colors
                      ${
                        block.position === opt.value
                          ? 'bg-primary text-background'
                          : 'bg-transparent text-muted hover:text-text'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Style selector */}
              <div className="flex items-center gap-1">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateBlock(block.id, { style: opt.value })}
                    className={`
                      font-heading text-[11px] uppercase tracking-wider px-2 py-1
                      border border-border transition-colors
                      ${
                        block.style === opt.value
                          ? 'bg-primary text-background'
                          : 'bg-transparent text-muted hover:text-text'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Font size selector */}
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-muted mr-1">SIZE</span>
                {FONT_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateBlock(block.id, { fontSize: opt.value })}
                    className={`
                      font-heading text-[11px] uppercase tracking-wider px-2 py-1
                      border border-border transition-colors
                      ${
                        block.fontSize === opt.value
                          ? 'bg-primary text-background'
                          : 'bg-transparent text-muted hover:text-text'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Delete */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="font-heading text-[11px] uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                >
                  [DELETE]
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add button */}
      <button
        onClick={addBlock}
        className="
          w-full px-4 py-3 font-heading text-xs uppercase tracking-wider
          text-primary hover:bg-surface/80 transition-colors
          border-t border-border
        "
      >
        [ADD TEXT]
      </button>
    </div>
  );
}
