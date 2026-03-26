// @crumb video-text-renderer
// [UI] | Overlay renderer | Text compositor
// why: Renders text overlays on video during playback—composites text layer over video
// in:[text objects array, video frame, rendering context] out:[composite frame with overlays] err:[render, composite errors]
// hazard: Text rendering not font-loaded aware—text may appear in wrong font during initial load
// hazard: No caching of rendered text—each frame re-renders all overlays from scratch
// edge:apps/studio/src/components/logbook/TextOverlayEditor.tsx -> RELATES
// prompt: Implement font preload detection, add text rendering cache with frame ID key

'use client';

import { useMemo } from 'react';

export interface TextBlock {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  position: 'top' | 'center' | 'bottom';
  style: 'caption' | 'title' | 'callout';
  fontSize: 'sm' | 'md' | 'lg';
}

interface VideoTextRendererProps {
  textBlocks: TextBlock[];
  currentTime: number;
}

const FONT_SIZE_MAP: Record<TextBlock['fontSize'], number> = {
  sm: 14,
  md: 20,
  lg: 32,
};

export function VideoTextRenderer({
  textBlocks,
  currentTime,
}: VideoTextRendererProps) {
  const visibleBlocks = useMemo(
    () =>
      textBlocks.filter(
        (block) => currentTime >= block.startTime && currentTime < block.endTime
      ),
    [textBlocks, currentTime]
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 15 }}
    >
      {textBlocks.map((block) => {
        const isVisible = visibleBlocks.some((vb) => vb.id === block.id);

        return (
          <TextOverlay key={block.id} block={block} visible={isVisible} />
        );
      })}
    </div>
  );
}

function TextOverlay({
  block,
  visible,
}: {
  block: TextBlock;
  visible: boolean;
}) {
  const fontSize = FONT_SIZE_MAP[block.fontSize];

  const positionClasses = getPositionClasses(block.position, block.style);
  const styleProps = getStyleProps(block.style, fontSize);

  return (
    <div
      className={`absolute left-0 right-0 flex transition-opacity duration-300 ease-in-out ${positionClasses}`}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className={styleProps.className} style={styleProps.inlineStyle}>
        {block.text}
      </div>
    </div>
  );
}

function getPositionClasses(
  position: TextBlock['position'],
  style: TextBlock['style']
): string {
  if (style === 'callout') {
    // Callout always pins to top-left area regardless of position prop
    return 'top-8 justify-start px-6';
  }

  switch (position) {
    case 'top':
      return 'top-8 justify-center';
    case 'center':
      return 'top-1/2 -translate-y-1/2 justify-center';
    case 'bottom':
      return 'bottom-8 justify-center';
  }
}

function getStyleProps(
  style: TextBlock['style'],
  fontSize: number
): { className: string; inlineStyle: React.CSSProperties } {
  switch (style) {
    case 'caption':
      return {
        className:
          'text-white rounded-md px-4 py-2 text-center max-w-[80%]',
        inlineStyle: {
          fontSize,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          lineHeight: 1.4,
        },
      };

    case 'title':
      return {
        className:
          'font-heading font-bold uppercase text-center max-w-[90%]',
        inlineStyle: {
          fontSize,
          color: '#D4F85A',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.6)',
          lineHeight: 1.2,
        },
      };

    case 'callout':
      return {
        className: 'font-mono max-w-[70%]',
        inlineStyle: {
          fontSize,
          color: '#D4F85A',
          borderLeft: '3px solid #D4F85A',
          paddingLeft: 12,
          lineHeight: 1.5,
        },
      };
  }
}
