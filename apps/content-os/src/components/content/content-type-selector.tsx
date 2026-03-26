// @crumb content-type-selector
// UI | Content intake | Type selection | Source format chooser
// why: Simple button set for user to select content source type (blog text, video, or audio) before upload/entry
// in:[selected: ContentNodeType, onChange callback] out:[calls onChange with selected type] err:[invalid type value, null onChange]
// hazard: No validation that selected type matches downstream handler—user selects VIDEO but paste text and decomposition fails silently
// hazard: Button text and descriptions are hardcoded—localization or UX copy changes require code modification
// edge:./content-node.ts -> READS [ContentNodeType enum values]
// edge:../editor/tiptap-editor.tsx -> RELATES [BLOG type routes to editor]
// prompt: Consider ContentNodeType to file handler mapping validation. Extract button labels to config object for i18n.

'use client';

import type { ContentNodeType } from '@/domain';

interface ContentTypeSelectorProps {
  selected: ContentNodeType;
  onChange: (type: ContentNodeType) => void;
}

const types: { value: ContentNodeType; label: string; description: string }[] = [
  { value: 'blog', label: 'BLOG', description: 'Write long-form text' },
  { value: 'video', label: 'VIDEO', description: 'Upload video file' },
  { value: 'audio', label: 'AUDIO', description: 'Upload audio file' },
];

export function ContentTypeSelector({ selected, onChange }: ContentTypeSelectorProps) {
  return (
    <div className="flex gap-2">
      {types.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`
            flex-1 px-4 py-3 border transition-colors text-left
            ${selected === t.value
              ? 'border-primary bg-surface'
              : 'border-border hover:border-muted'
            }
          `}
        >
          <div className={`font-button text-xs ${selected === t.value ? 'text-primary' : 'text-muted'}`}>
            {t.label}
          </div>
          <div className="font-small text-muted mt-1">{t.description}</div>
        </button>
      ))}
    </div>
  );
}
