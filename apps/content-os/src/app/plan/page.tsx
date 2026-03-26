// @crumb planning-hub
// UI | content-planning | hub | type-selector
// why: Central content planning hub — choose content type (blog, image, video, audio, social) then plan with type-specific tools
// in:[user content-type selection] out:[type-specific planning interface]
// edge:../../components/plan/writing-frameworks.tsx -> USES (WritingFrameworks — blog planning)
// edge:../../components/image-editor/useImageEditor.ts -> IMPORTS (CANVAS_PRESETS for image preset grid)
// edge:../editor/image/page.tsx -> NAVIGATES-TO (on image preset click)
// edge:../content/new -> NAVIGATES-TO (on video/audio/social plan save)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WritingFrameworks } from '@/components/plan/writing-frameworks';
import { CANVAS_PRESETS } from '@/components/image-editor';
import { frameworkCategories } from '@/lib/frameworks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentTypeId = 'blog' | 'image' | 'video' | 'audio' | 'social';

interface ContentTypeCard {
  id: ContentTypeId;
  icon: string;
  label: string;
  description: string;
  color: string;
}

const CONTENT_TYPES: ContentTypeCard[] = [
  {
    id: 'blog',
    icon: '\u270F\uFE0F',
    label: 'Blog Post',
    description: `${frameworkCategories.length} categories, ${frameworkCategories.reduce((s, c) => s + c.frameworks.length, 0)} writing frameworks to structure your next article`,
    color: '#6366f1',
  },
  {
    id: 'image',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Image / Graphic',
    description: 'Platform-optimized presets for Instagram, LinkedIn, Twitter, and more',
    color: '#ec4899',
  },
  {
    id: 'video',
    icon: '\uD83C\uDFAC',
    label: 'Video',
    description: 'Script outline, shot list, b-roll notes, and talking points',
    color: '#f59e0b',
  },
  {
    id: 'audio',
    icon: '\uD83C\uDF99\uFE0F',
    label: 'Audio / Podcast',
    description: 'Episode outline, guest questions, segment structure, show notes',
    color: '#10b981',
  },
  {
    id: 'social',
    icon: '\uD83D\uDCF1',
    label: 'Social Media Post',
    description: 'Quick planner with platform selector, character counts, and hashtags',
    color: '#3b82f6',
  },
];

// Additional image presets beyond the editor defaults
const IMAGE_PRESETS = [
  ...CANVAS_PRESETS,
  { label: 'Facebook Cover', width: 820, height: 312 },
  { label: 'Pinterest Pin', width: 1000, height: 1500 },
  { label: 'YouTube Thumbnail', width: 1280, height: 720 },
];

// ---------------------------------------------------------------------------
// Social platform config
// ---------------------------------------------------------------------------

interface SocialPlatform {
  id: string;
  label: string;
  maxChars: number;
  color: string;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: 'twitter', label: 'X / Twitter', maxChars: 280, color: '#1da1f2' },
  { id: 'linkedin', label: 'LinkedIn', maxChars: 3000, color: '#0a66c2' },
  { id: 'instagram', label: 'Instagram', maxChars: 2200, color: '#e1306c' },
  { id: 'threads', label: 'Threads', maxChars: 500, color: '#000000' },
  { id: 'bluesky', label: 'Bluesky', maxChars: 300, color: '#0085ff' },
  { id: 'facebook', label: 'Facebook', maxChars: 63206, color: '#1877f2' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors"
      style={{ color: 'var(--theme-muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-foreground)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--theme-muted)'; }}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to content types
      <span style={{ color: 'var(--theme-foreground)' }} className="font-semibold ml-2">{title}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Image Preset Grid
// ---------------------------------------------------------------------------

function ImagePresetGrid({ onBack }: { onBack: () => void }) {
  const router = useRouter();

  const handlePresetClick = (preset: { label: string; width: number; height: number }) => {
    router.push(`/editor/image?w=${preset.width}&h=${preset.height}`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader onBack={onBack} title="Image / Graphic" />
      <p className="text-sm mb-6" style={{ color: 'var(--theme-muted)' }}>
        Choose a platform preset to open the image editor at the correct dimensions.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {IMAGE_PRESETS.map((preset) => {
          const aspect = preset.width / preset.height;
          const previewH = 100;
          const previewW = Math.round(previewH * aspect);
          return (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              className="group rounded-xl p-5 text-left transition-all"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                border: '1px solid var(--theme-card-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ec4899';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-card-border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Aspect ratio preview */}
              <div className="flex items-center justify-center mb-4" style={{ height: '80px' }}>
                <div
                  className="rounded border"
                  style={{
                    width: `${Math.min(previewW, 120)}px`,
                    height: `${Math.min(previewH, 80)}px`,
                    maxWidth: '120px',
                    maxHeight: '80px',
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: 'var(--theme-border)',
                  }}
                />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-foreground)' }}>
                {preset.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                {preset.width} x {preset.height}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video Planner
// ---------------------------------------------------------------------------

function VideoPlanner({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [shotList, setShotList] = useState('');
  const [broll, setBroll] = useState('');
  const [talkingPoints, setTalkingPoints] = useState('');

  const handleSave = () => {
    const plan = { title: title || 'Untitled Video', contentType: 'video', script, shotList, broll, talkingPoints };
    localStorage.setItem('videoPlan', JSON.stringify(plan));
    window.location.href = '/content/new?type=video';
  };

  const sections = [
    { label: 'Script Outline', value: script, setter: setScript, placeholder: 'Hook / intro\nMain points\nCall to action\nOutro', rows: 6 },
    { label: 'Shot List', value: shotList, setter: setShotList, placeholder: 'Shot 1: Wide establishing shot\nShot 2: Close-up on product\nShot 3: Talking head', rows: 5 },
    { label: 'B-Roll Notes', value: broll, setter: setBroll, placeholder: 'Office environment\nProduct close-ups\nTeam working together', rows: 4 },
    { label: 'Talking Points', value: talkingPoints, setter: setTalkingPoints, placeholder: 'Key message 1\nKey message 2\nStatistic to mention\nAnecdote', rows: 4 },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <SectionHeader onBack={onBack} title="Video" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Video title..."
        className="w-full text-xl font-semibold bg-transparent outline-none mb-6"
        style={{ color: 'var(--theme-foreground)' }}
      />
      <div className="space-y-5">
        {sections.map((s) => (
          <div key={s.label}>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-muted)' }}>
              {s.label}
            </label>
            <textarea
              value={s.value}
              onChange={(e) => s.setter(e.target.value)}
              placeholder={s.placeholder}
              rows={s.rows}
              className="w-full rounded-lg p-4 text-sm outline-none resize-none leading-relaxed"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                color: 'var(--theme-foreground)',
                border: '1px solid var(--theme-card-border)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
        >
          Save and start creating
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audio / Podcast Planner
// ---------------------------------------------------------------------------

function AudioPlanner({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [episodeOutline, setEpisodeOutline] = useState('');
  const [guestQuestions, setGuestQuestions] = useState('');
  const [segments, setSegments] = useState('');
  const [showNotes, setShowNotes] = useState('');

  const handleSave = () => {
    const plan = { title: title || 'Untitled Episode', contentType: 'audio', episodeOutline, guestQuestions, segments, showNotes };
    localStorage.setItem('audioPlan', JSON.stringify(plan));
    window.location.href = '/content/new?type=audio';
  };

  const sections = [
    { label: 'Episode Outline', value: episodeOutline, setter: setEpisodeOutline, placeholder: 'Cold open / teaser\nIntro music + welcome\nMain topic discussion\nGuest segment\nListener Q&A\nClosing + CTA', rows: 6 },
    { label: 'Guest Questions', value: guestQuestions, setter: setGuestQuestions, placeholder: 'Q1: What inspired you to start...?\nQ2: Walk us through your process for...\nQ3: What advice would you give to...?', rows: 5 },
    { label: 'Segment Structure', value: segments, setter: setSegments, placeholder: 'Segment 1 (0:00-5:00): Introduction\nSegment 2 (5:00-15:00): Deep dive\nSegment 3 (15:00-25:00): Guest interview\nSegment 4 (25:00-30:00): Wrap-up', rows: 5 },
    { label: 'Show Notes Template', value: showNotes, setter: setShowNotes, placeholder: 'Episode summary:\nKey takeaways:\n- \nResources mentioned:\n- \nGuest links:\n- ', rows: 5 },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <SectionHeader onBack={onBack} title="Audio / Podcast" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Episode title..."
        className="w-full text-xl font-semibold bg-transparent outline-none mb-6"
        style={{ color: 'var(--theme-foreground)' }}
      />
      <div className="space-y-5">
        {sections.map((s) => (
          <div key={s.label}>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-muted)' }}>
              {s.label}
            </label>
            <textarea
              value={s.value}
              onChange={(e) => s.setter(e.target.value)}
              placeholder={s.placeholder}
              rows={s.rows}
              className="w-full rounded-lg p-4 text-sm outline-none resize-none leading-relaxed"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                color: 'var(--theme-foreground)',
                border: '1px solid var(--theme-card-border)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
        >
          Save and start creating
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social Media Planner
// ---------------------------------------------------------------------------

function SocialPlanner({ onBack }: { onBack: () => void }) {
  const [platform, setPlatform] = useState<SocialPlatform>(SOCIAL_PLATFORMS[0]);
  const [postText, setPostText] = useState('');
  const [hashtags, setHashtags] = useState('');

  const charCount = postText.length;
  const charPercent = Math.min((charCount / platform.maxChars) * 100, 100);
  const isOver = charCount > platform.maxChars;

  const handleSave = () => {
    const plan = { title: postText.slice(0, 60) || 'Untitled Post', contentType: 'social', platform: platform.id, postText, hashtags };
    localStorage.setItem('socialPlan', JSON.stringify(plan));
    window.location.href = '/content/new?type=social';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <SectionHeader onBack={onBack} title="Social Media Post" />

      {/* Platform selector */}
      <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-muted)' }}>
        Platform
      </label>
      <div className="flex flex-wrap gap-2 mb-6">
        {SOCIAL_PLATFORMS.map((p) => {
          const isActive = p.id === platform.id;
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? p.color : 'var(--theme-card-bg)',
                color: isActive ? '#ffffff' : 'var(--theme-foreground)',
                border: isActive ? `1px solid ${p.color}` : '1px solid var(--theme-card-border)',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Post content */}
      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-muted)' }}>
        Post Content
      </label>
      <div className="relative mb-1">
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder={`Write your ${platform.label} post...`}
          rows={6}
          className="w-full rounded-lg p-4 text-sm outline-none resize-none leading-relaxed"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            color: 'var(--theme-foreground)',
            border: `1px solid ${isOver ? '#ef4444' : 'var(--theme-card-border)'}`,
          }}
        />
      </div>

      {/* Character count bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 h-1.5 rounded-full mr-3" style={{ backgroundColor: 'var(--theme-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${charPercent}%`,
              backgroundColor: isOver ? '#ef4444' : charPercent > 80 ? '#f59e0b' : 'var(--theme-primary)',
            }}
          />
        </div>
        <span
          className="text-xs font-mono shrink-0"
          style={{ color: isOver ? '#ef4444' : 'var(--theme-muted)' }}
        >
          {charCount} / {platform.maxChars}
        </span>
      </div>

      {/* Hashtags */}
      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-muted)' }}>
        Hashtags
      </label>
      <input
        type="text"
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
        placeholder="#contentstrategy #marketing #socialmedia"
        className="w-full rounded-lg px-4 py-3 text-sm outline-none mb-4"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          color: 'var(--theme-foreground)',
          border: '1px solid var(--theme-card-border)',
        }}
      />

      {/* Placeholder sections */}
      <div
        className="rounded-lg p-4 mb-6"
        style={{ backgroundColor: 'var(--theme-surface)', border: '1px dashed var(--theme-border)' }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--theme-muted)' }}>
          Coming soon
        </p>
        <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
          Best time to post suggestions and AI-powered hashtag recommendations will appear here.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
        >
          Save and start creating
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Hub Page
// ---------------------------------------------------------------------------

export default function PlanPage() {
  const [activeType, setActiveType] = useState<ContentTypeId | null>(null);

  // Blog post opens WritingFrameworks in full view
  if (activeType === 'blog') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--theme-border)' }}>
          <button
            onClick={() => setActiveType(null)}
            className="flex items-center gap-2 text-xs font-medium transition-colors"
            style={{ color: 'var(--theme-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-foreground)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--theme-muted)'; }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to content types
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <WritingFrameworks />
        </div>
      </div>
    );
  }

  // Other types render inside a scrollable container
  if (activeType) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {activeType === 'image' && <ImagePresetGrid onBack={() => setActiveType(null)} />}
          {activeType === 'video' && <VideoPlanner onBack={() => setActiveType(null)} />}
          {activeType === 'audio' && <AudioPlanner onBack={() => setActiveType(null)} />}
          {activeType === 'social' && <SocialPlanner onBack={() => setActiveType(null)} />}
        </div>
      </div>
    );
  }

  // Hub view — content type cards
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-foreground)' }}>
            Plan Your Content
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-muted)', maxWidth: '600px' }}>
            Choose a content type to get started. Each planner gives you the structure and tools
            specific to that format so you can go from idea to draft faster.
          </p>
        </div>

        {/* Content type cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className="group rounded-xl p-6 text-left transition-all"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                border: '1px solid var(--theme-card-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = type.color;
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 8px 25px -5px ${type.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-card-border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: `${type.color}15` }}
              >
                {type.icon}
              </div>

              {/* Label + description */}
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--theme-foreground)' }}>
                {type.label}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
                {type.description}
              </p>

              {/* Arrow indicator */}
              <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: type.color }}>
                Start planning
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Recent plans section */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--theme-muted)' }}>
            Recent Plans
          </h2>
          <div
            className="rounded-xl p-8 flex flex-col items-center justify-center"
            style={{
              backgroundColor: 'var(--theme-surface)',
              border: '1px dashed var(--theme-border)',
              minHeight: '120px',
            }}
          >
            <svg className="w-8 h-8 mb-3" style={{ color: 'var(--theme-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6" /><path d="M9 16h6" />
            </svg>
            <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              Your recent drafts and plans will appear here as you create them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
