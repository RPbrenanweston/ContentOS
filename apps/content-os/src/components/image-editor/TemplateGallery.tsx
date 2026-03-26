'use client';

// @crumb image-editor-template-gallery
// UI | image-editor | template-gallery
// why: Pre-designed template browser that loads full canvas layouts via Fabric enlivenObjects
// in:[template-click] out:[canvas-populated] err:[empty-canvas-check]
// hazard: Always confirm before replacing non-empty canvas content

import { useState } from 'react';
import { TEMPLATE_PRESETS } from './templatePresets';
import type { UseImageEditorReturn } from './useImageEditor';

interface TemplateGalleryProps {
  editor: UseImageEditorReturn;
}

// Color swatch for template thumbnail preview
const TEMPLATE_COLORS: Record<string, { bg: string; accent: string }> = {
  'social-post':   { bg: '#4f46e5', accent: '#7c3aed' },
  'quote-card':    { bg: '#111827', accent: '#d4f85a' },
  'announcement':  { bg: '#2563eb', accent: '#ffffff' },
  'story-template': { bg: '#0f172a', accent: '#1e293b' },
  'linkedin-banner': { bg: '#1d4ed8', accent: '#0f172a' },
};

function TemplateThumbnail({ id, width, height }: { id: string; width: number; height: number }) {
  const colors = TEMPLATE_COLORS[id] ?? { bg: '#6b7280', accent: '#374151' };
  const isPortrait = height > width;
  const isLandscapeWide = width / height > 3;

  return (
    <div
      className="w-full rounded overflow-hidden flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${colors.bg}, ${colors.accent})`,
        aspectRatio: isPortrait ? '9/16' : isLandscapeWide ? '4/1' : '1/1',
        minHeight: isLandscapeWide ? '28px' : '60px',
      }}
    >
      {/* Minimal layout indicator lines */}
      <div className="w-full px-2 space-y-1">
        <div
          className="rounded"
          style={{
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.7)',
            width: isLandscapeWide ? '60%' : '80%',
            margin: '0 auto',
          }}
        />
        {!isLandscapeWide && (
          <div
            className="rounded"
            style={{
              height: '2px',
              backgroundColor: 'rgba(255,255,255,0.4)',
              width: '55%',
              margin: '0 auto',
            }}
          />
        )}
      </div>
    </div>
  );
}

export function TemplateGallery({ editor }: TemplateGalleryProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleTemplateClick = async (templateId: string) => {
    const template = TEMPLATE_PRESETS.find((t) => t.id === templateId);
    if (!template) return;

    // Confirm if canvas is not empty
    if (!editor.isCanvasEmpty()) {
      const confirmed = window.confirm(
        'Loading a template will replace the current canvas content. Continue?'
      );
      if (!confirmed) return;
    }

    setLoadingId(templateId);
    try {
      await editor.loadTemplate(template);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--theme-muted)' }}
      >
        Templates
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATE_PRESETS.map((template) => {
          const isLoading = loadingId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template.id)}
              disabled={isLoading}
              className="flex flex-col gap-1.5 text-left rounded p-1.5 transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                border: '1px solid var(--theme-border)',
                backgroundColor: 'var(--theme-background)',
              }}
              title={`${template.name} — ${template.width}x${template.height}`}
            >
              <TemplateThumbnail
                id={template.id}
                width={template.width}
                height={template.height}
              />
              <div className="px-0.5">
                <p
                  className="text-[10px] font-medium truncate"
                  style={{ color: 'var(--theme-foreground)' }}
                >
                  {isLoading ? 'Loading...' : template.name}
                </p>
                <p
                  className="text-[9px] truncate"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  {template.width}x{template.height}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
