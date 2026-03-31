'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ContentNode, ContentType } from '@/domain';

const LIME = '#CBFF53';

const CONTENT_TYPE_TABS: { value: ContentType; label: string }[] = [
  { value: 'blog', label: 'Blog' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
];

interface ContentEditorProps {
  initialData?: ContentNode;
  defaultType?: ContentType;
  onSaved?: (node: ContentNode) => void;
}

export default function ContentEditor({
  initialData,
  defaultType = 'blog',
  onSaved,
}: ContentEditorProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [contentType, setContentType] = useState<ContentType>(
    initialData?.content_type ?? defaultType
  );
  const [status, setStatus] = useState(initialData?.status ?? 'draft');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [authError, setAuthError] = useState(false);
  const [nodeId, setNodeId] = useState<string | null>(initialData?.id ?? null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      CharacterCount,
    ],
    content: initialData?.body ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-0',
      },
    },
  });

  const save = useCallback(
    async (fields: {
      title: string;
      description: string;
      content_type: ContentType;
      body: unknown;
    }) => {
      if (!fields.title.trim()) return;
      setSaving('saving');

      try {
        setAuthError(false);
        if (nodeId) {
          const res = await fetch(`/api/content/${nodeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: fields.title,
              description: fields.description,
              body: fields.body,
            }),
          });
          if (res.status === 401) {
            setAuthError(true);
            throw new Error('Unauthorized');
          }
          if (!res.ok) throw new Error('Save failed');
          const { data } = await res.json();
          setSaving('saved');
          onSaved?.(data);
        } else {
          const res = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: fields.title,
              content_type: fields.content_type,
              description: fields.description,
              body: fields.body,
            }),
          });
          if (res.status === 401) {
            setAuthError(true);
            throw new Error('Unauthorized');
          }
          if (!res.ok) throw new Error('Create failed');
          const { data } = await res.json();
          setNodeId(data.id);
          setSaving('saved');
          onSaved?.(data);
          window.history.replaceState({}, '', `/content/${data.id}`);
        }
      } catch {
        setSaving('error');
      }

      setTimeout(() => setSaving('idle'), 2000);
    },
    [nodeId, onSaved]
  );

  // Debounced auto-save on content change
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        save({
          title,
          description,
          content_type: contentType,
          body: editor.getJSON(),
        });
      }, 1500);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, title, description, contentType, save]);

  // Manual save on title/description blur
  const handleBlurSave = () => {
    if (!editor || !title.trim()) return;
    save({
      title,
      description,
      content_type: contentType,
      body: editor.getJSON(),
    });
  };

  const handleManualSave = () => {
    if (!editor || !title.trim()) return;
    save({
      title,
      description,
      content_type: contentType,
      body: editor.getJSON(),
    });
  };

  const wordCount = editor?.storage?.characterCount?.words?.() ?? 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Top Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        {/* LEFT: Content type tabs */}
        <div className="flex items-center gap-1">
          {CONTENT_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                if (!initialData) setContentType(tab.value);
              }}
              disabled={!!initialData}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: contentType === tab.value ? LIME : 'transparent',
                color: contentType === tab.value ? '#1a1a1a' : 'var(--muted-foreground)',
              }}
            >
              {tab.label}
            </button>
          ))}

          {/* Separator */}
          <div
            className="w-px h-5 mx-2"
            style={{ background: 'var(--border)' }}
          />

          {/* Voice and Sprint buttons */}
          <button
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
              background: 'transparent',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Voice
          </button>

          <button
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
              background: 'transparent',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Sprint
          </button>
        </div>

        {/* RIGHT: Stats + auth warning + save */}
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {wordCount} words
          </span>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {readTime} min read
          </span>

          <SaveIndicator state={saving} />

          {authError && (
            <span className="text-xs font-medium" style={{ color: '#dc2626' }}>
              Sign in required — <a href="/auth/login" style={{ textDecoration: 'underline' }}>Log in</a>
            </span>
          )}

          <button
            onClick={handleManualSave}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-colors"
            style={{ background: LIME, color: '#1a1a1a' }}
          >
            Save
          </button>
        </div>
      </div>

      {/* Editor area -- scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Untitled"
            className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-3 leading-tight"
            style={{ color: 'var(--foreground)' }}
          />

          {/* Description */}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Add a description (optional)"
            className="w-full text-base bg-transparent border-none outline-none mb-8"
            style={{ color: 'var(--muted-foreground)' }}
          />

          {/* Tiptap body */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Format toolbar */}
      {editor && <FormatBar editor={editor} />}
    </div>
  );
}

function FormatBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
      style={{
        background: active ? 'var(--foreground)' : 'transparent',
        color: active ? 'var(--background)' : 'var(--muted-foreground)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex items-center gap-0.5 px-4 py-1.5 border-t shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      {btn('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
      {btn('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
      {btn('`', editor.isActive('code'), () => editor.chain().focus().toggleCode().run())}
      <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
      {btn('H2', editor.isActive('heading', { level: 2 }), () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      )}
      {btn('H3', editor.isActive('heading', { level: 3 }), () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      )}
      {btn('List', editor.isActive('bulletList'), () =>
        editor.chain().focus().toggleBulletList().run()
      )}
      {btn('1.', editor.isActive('orderedList'), () =>
        editor.chain().focus().toggleOrderedList().run()
      )}
      {btn('Quote', editor.isActive('blockquote'), () =>
        editor.chain().focus().toggleBlockquote().run()
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;
  const map = {
    saving: { text: 'Saving...', color: 'var(--muted-foreground)' },
    saved: { text: 'Saved', color: '#16a34a' },
    error: { text: 'Save failed', color: '#dc2626' },
  };
  const { text, color } = map[state];
  return (
    <span className="text-xs" style={{ color }}>
      {text}
    </span>
  );
}
