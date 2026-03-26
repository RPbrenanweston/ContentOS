'use client';

// @crumb image-editor-template-picker
// UI | image-editor | template-picker-entry
// why: Canva-style entry screen — lets users pick a platform template before entering canvas editor
// in:[user-click] out:[selected-template-dimensions] err:[none]

import { useState } from 'react';

export interface TemplateDefinition {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number;
  gradient: string;
  patternType: 'diagonal' | 'grid' | 'dots' | 'waves' | 'solid' | 'radial';
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E4405F',
  Facebook: '#1877F2',
  LinkedIn: '#0A66C2',
  Twitter: '#000000',
  Pinterest: '#BD081C',
  TikTok: '#010101',
  YouTube: '#FF0000',
  Popular: '#6366F1',
  Custom: '#374151',
};

const TEMPLATES: TemplateDefinition[] = [
  // Instagram
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    platform: 'Instagram',
    width: 1080,
    height: 1080,
    gradient: 'linear-gradient(135deg, #E4405F 0%, #F56040 50%, #FFDC80 100%)',
    patternType: 'diagonal',
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    platform: 'Instagram',
    width: 1080,
    height: 1920,
    gradient: 'linear-gradient(180deg, #833AB4 0%, #E4405F 50%, #F56040 100%)',
    patternType: 'waves',
  },
  {
    id: 'instagram-reel',
    name: 'Instagram Reel Cover',
    platform: 'Instagram',
    width: 1080,
    height: 1920,
    gradient: 'linear-gradient(135deg, #E4405F 0%, #833AB4 100%)',
    patternType: 'dots',
  },
  // Facebook
  {
    id: 'facebook-post',
    name: 'Facebook Post',
    platform: 'Facebook',
    width: 940,
    height: 788,
    gradient: 'linear-gradient(135deg, #1877F2 0%, #0A5DC2 100%)',
    patternType: 'grid',
  },
  {
    id: 'facebook-cover',
    name: 'Facebook Cover',
    platform: 'Facebook',
    width: 820,
    height: 312,
    gradient: 'linear-gradient(90deg, #1877F2 0%, #42A5F5 100%)',
    patternType: 'diagonal',
  },
  // LinkedIn
  {
    id: 'linkedin-post',
    name: 'LinkedIn Post',
    platform: 'LinkedIn',
    width: 1200,
    height: 1200,
    gradient: 'linear-gradient(135deg, #0A66C2 0%, #0D8ECF 100%)',
    patternType: 'grid',
  },
  {
    id: 'linkedin-banner',
    name: 'LinkedIn Banner',
    platform: 'LinkedIn',
    width: 1584,
    height: 396,
    gradient: 'linear-gradient(90deg, #0A66C2 0%, #0F172A 100%)',
    patternType: 'diagonal',
  },
  // Twitter
  {
    id: 'twitter-post',
    name: 'Twitter / X Post',
    platform: 'Twitter',
    width: 1600,
    height: 900,
    gradient: 'linear-gradient(135deg, #1C1C1C 0%, #374151 100%)',
    patternType: 'dots',
  },
  // Pinterest
  {
    id: 'pinterest-pin',
    name: 'Pinterest Pin',
    platform: 'Pinterest',
    width: 1000,
    height: 1500,
    gradient: 'linear-gradient(180deg, #BD081C 0%, #E8205C 100%)',
    patternType: 'waves',
  },
  // TikTok
  {
    id: 'tiktok-cover',
    name: 'TikTok Cover',
    platform: 'TikTok',
    width: 1080,
    height: 1920,
    gradient: 'linear-gradient(135deg, #010101 0%, #1A1A2E 50%, #16213E 100%)',
    patternType: 'radial',
  },
  // YouTube
  {
    id: 'youtube-thumbnail',
    name: 'YouTube Thumbnail',
    platform: 'YouTube',
    width: 1280,
    height: 720,
    gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 50%, #8B0000 100%)',
    patternType: 'diagonal',
  },
  {
    id: 'youtube-banner',
    name: 'YouTube Banner',
    platform: 'YouTube',
    width: 2560,
    height: 1440,
    gradient: 'linear-gradient(90deg, #FF0000 0%, #CC0000 100%)',
    patternType: 'grid',
  },
];

const PLATFORM_FILTERS = [
  'Popular',
  'Facebook',
  'Instagram',
  'LinkedIn',
  'Pinterest',
  'TikTok',
  'Twitter',
  'YouTube',
];

const POPULAR_IDS = new Set([
  'instagram-post',
  'instagram-story',
  'facebook-post',
  'linkedin-post',
  'twitter-post',
  'youtube-thumbnail',
]);

// SVG patterns for each card type
function PatternOverlay({ type, color }: { type: TemplateDefinition['patternType']; color: string }) {
  if (type === 'diagonal') {
    return (
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`diag-${color}`} patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="white" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#diag-${color})`} />
      </svg>
    );
  }
  if (type === 'grid') {
    return (
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`grid-${color}`} patternUnits="userSpaceOnUse" width="20" height="20">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${color})`} />
      </svg>
    );
  }
  if (type === 'dots') {
    return (
      <svg
        className="absolute inset-0 w-full h-full opacity-15"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`dots-${color}`} patternUnits="userSpaceOnUse" width="16" height="16">
            <circle cx="8" cy="8" r="1.5" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${color})`} />
      </svg>
    );
  }
  if (type === 'waves') {
    return (
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M0,100 C50,60 150,140 200,100 L200,200 L0,200 Z" fill="white" />
        <path d="M0,130 C50,90 150,170 200,130 L200,200 L0,200 Z" fill="white" opacity="0.5" />
      </svg>
    );
  }
  if (type === 'radial') {
    return (
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="100" cy="100" r="80" fill="none" stroke="white" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="55" fill="none" stroke="white" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="white" strokeWidth="0.5" />
      </svg>
    );
  }
  // solid — no overlay
  return null;
}

// Platform icon badges (simple letter marks)
function PlatformBadge({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] ?? '#6366F1';
  const initials: Record<string, string> = {
    Instagram: 'IG',
    Facebook: 'FB',
    LinkedIn: 'LI',
    Twitter: 'X',
    Pinterest: 'Pi',
    TikTok: 'TT',
    YouTube: 'YT',
  };
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[9px] font-bold flex-shrink-0"
      style={{ backgroundColor: color }}
      aria-label={platform}
    >
      {initials[platform] ?? platform.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Aspect-ratio aware thumbnail preview area
function TemplateThumb({ template }: { template: TemplateDefinition }) {
  const aspectRatio = template.width / template.height;
  // Max height 120px for the thumb area; calculate width from aspect ratio capped at container
  const thumbHeight = 120;
  const thumbWidth = Math.min(Math.round(thumbHeight * aspectRatio), 160);
  const isPortrait = aspectRatio < 1;
  const isUltraWide = aspectRatio > 3;

  return (
    <div className="flex items-center justify-center" style={{ height: '120px' }}>
      <div
        className="relative overflow-hidden rounded-md shadow-md flex-shrink-0"
        style={{
          width: isUltraWide ? '100%' : isPortrait ? `${thumbWidth}px` : `${Math.min(thumbWidth, 130)}px`,
          height: isUltraWide ? '40px' : `${thumbHeight}px`,
          background: template.gradient,
        }}
      >
        <PatternOverlay type={template.patternType} color={template.platform} />
        {/* Subtle shimmer lines for visual depth */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
          }}
        />
      </div>
    </div>
  );
}

interface CustomSizeFormProps {
  onConfirm: (width: number, height: number) => void;
  onCancel: () => void;
}

function CustomSizeForm({ onConfirm, onCancel }: CustomSizeFormProps) {
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (width < 100 || width > 8000 || height < 100 || height > 8000) {
      setError('Width and height must be between 100 and 8000 px.');
      return;
    }
    setError('');
    onConfirm(width, height);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Custom canvas size"
    >
      <div
        className="rounded-xl p-8 shadow-2xl w-full max-w-sm"
        style={{
          backgroundColor: 'var(--theme-surface, #1e1e2e)',
          border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
          color: 'var(--theme-foreground, #f1f5f9)',
        }}
      >
        <h2 className="text-lg font-semibold mb-1">Custom Canvas Size</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--theme-muted, #94a3b8)' }}>
          Enter your desired dimensions in pixels.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <label className="flex flex-col gap-1 flex-1 text-sm font-medium">
              Width (px)
              <input
                type="number"
                min={100}
                max={8000}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--theme-background, #0f0f1a)',
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.15))',
                  color: 'var(--theme-foreground, #f1f5f9)',
                  outline: 'none',
                }}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1 flex-1 text-sm font-medium">
              Height (px)
              <input
                type="number"
                min={100}
                max={8000}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--theme-background, #0f0f1a)',
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.15))',
                  color: 'var(--theme-foreground, #f1f5f9)',
                  outline: 'none',
                }}
              />
            </label>
          </div>
          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
          )}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                border: '1px solid var(--theme-border, rgba(255,255,255,0.15))',
                color: 'var(--theme-muted, #94a3b8)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: '#6366F1',
                color: '#fff',
              }}
            >
              Create Canvas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface SelectedTemplate {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number;
}

interface TemplatePickerProps {
  onSelect: (template: SelectedTemplate) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const [activeFilter, setActiveFilter] = useState('Popular');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const visibleTemplates =
    activeFilter === 'Popular'
      ? TEMPLATES.filter((t) => POPULAR_IDS.has(t.id))
      : TEMPLATES.filter((t) => t.platform === activeFilter);

  function handleTemplateClick(template: TemplateDefinition) {
    onSelect({
      id: template.id,
      name: template.name,
      platform: template.platform,
      width: template.width,
      height: template.height,
    });
  }

  function handleCustomConfirm(width: number, height: number) {
    setShowCustomForm(false);
    onSelect({
      id: 'custom',
      name: 'Custom Canvas',
      platform: 'Custom',
      width,
      height,
    });
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: 'var(--theme-background, #0f0f1a)', color: 'var(--theme-foreground, #f1f5f9)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-10 pt-10 pb-6"
        style={{ borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.08))' }}
      >
        <h1 className="text-2xl font-bold tracking-tight mb-1">What would you like to create?</h1>
        <p className="text-sm" style={{ color: 'var(--theme-muted, #94a3b8)' }}>
          Choose a template to get started, or set a custom size.
        </p>

        {/* Platform filter pills */}
        <div className="flex flex-wrap gap-2 mt-5" role="group" aria-label="Filter by platform">
          {PLATFORM_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            const color = PLATFORM_COLORS[filter] ?? '#6366F1';
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: isActive ? color : 'transparent',
                  color: isActive ? '#fff' : 'var(--theme-muted, #94a3b8)',
                  border: isActive ? `1px solid ${color}` : '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                  boxShadow: isActive ? `0 0 12px ${color}44` : 'none',
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {visibleTemplates.map((template) => {
            const color = PLATFORM_COLORS[template.platform] ?? '#6366F1';
            return (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className="group flex flex-col rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--theme-surface, #1e1e2e)',
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
                aria-label={`${template.name} — ${template.width} x ${template.height}`}
              >
                {/* Thumbnail */}
                <div
                  className="px-4 pt-4 pb-3"
                  style={{ backgroundColor: 'var(--theme-surface, #1e1e2e)' }}
                >
                  <TemplateThumb template={template} />
                </div>

                {/* Card footer */}
                <div
                  className="px-3 py-3 flex flex-col gap-1 group-hover:opacity-90 transition-opacity"
                  style={{ borderTop: '1px solid var(--theme-border, rgba(255,255,255,0.06))' }}
                >
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={template.platform} />
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: 'var(--theme-foreground, #f1f5f9)' }}
                    >
                      {template.name}
                    </span>
                  </div>
                  <span className="text-[11px] pl-8" style={{ color: 'var(--theme-muted, #94a3b8)' }}>
                    {template.width} x {template.height} px
                  </span>
                </div>
              </button>
            );
          })}

          {/* Custom size card — always last in Popular or as standalone */}
          {(activeFilter === 'Popular' || activeFilter === 'Custom') && (
            <button
              onClick={() => setShowCustomForm(true)}
              className="group flex flex-col rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{
                backgroundColor: 'var(--theme-surface, #1e1e2e)',
                border: '1px dashed var(--theme-border, rgba(255,255,255,0.2))',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
              aria-label="Custom size"
            >
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-center" style={{ height: '120px' }}>
                  <div
                    className="flex flex-col items-center justify-center gap-2 w-24 h-24 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(99,102,241,0.12)',
                      border: '1.5px dashed rgba(99,102,241,0.4)',
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                </div>
              </div>
              <div
                className="px-3 py-3 flex flex-col gap-1"
                style={{ borderTop: '1px solid var(--theme-border, rgba(255,255,255,0.06))' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: '#6366F1' }}
                  >
                    +
                  </span>
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: 'var(--theme-foreground, #f1f5f9)' }}
                  >
                    Custom Size
                  </span>
                </div>
                <span className="text-[11px] pl-8" style={{ color: 'var(--theme-muted, #94a3b8)' }}>
                  Set your own dimensions
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Custom size modal */}
      {showCustomForm && (
        <CustomSizeForm
          onConfirm={handleCustomConfirm}
          onCancel={() => setShowCustomForm(false)}
        />
      )}
    </div>
  );
}
