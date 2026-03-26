'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ContentNode, ContentType } from '@/domain';

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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-0',
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
          if (!res.ok) throw new Error('Create failed');
          const { data } = await res.json();
          setNodeId(data.id);
          setSaving('saved');
          onSaved?.(data);
          // Update URL without navigation
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

  const handlePublish = async () => {
    if (!nodeId || !title.trim()) return;
    setSaving('saving');
    const res = await fetch(`/api/content/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ready',
        published_at: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setStatus('ready');
      setSaving('saved');
      onSaved?.(data);
    } else {
      setSaving('error');
    }
    setTimeout(() => setSaving('idle'), 2000);
  };

  const wordCount = editor?.storage?.characterCount?.words?.() ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <div className="flex items-center gap-3">
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            disabled={!!initialData}
            className="text-xs rounded border px-2 py-1"
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            <option value="blog">Blog</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="podcast_episode">Episode</option>
          </select>
          <StatusPill status={status} />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {wordCount} words
          </span>
          <SaveIndicator state={saving} />
          {status === 'draft' && nodeId && (
            <button
              onClick={handlePublish}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{ background: 'var(--primary, #3b82f6)', color: '#fff' }}
            >
              Mark ready
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Untitled"
            className="w-full text-3xl font-bold bg-transparent border-none outline-none mb-3 leading-tight"
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
      className="px-2 py-1 rounded text-xs font-medium transition-colors"
      style={{
        background: active ? 'var(--primary, #3b82f6)' : 'transparent',
        color: active ? '#fff' : 'var(--muted-foreground)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex items-center gap-1 px-4 py-2 border-t shrink-0"
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
      {btn('• List', editor.isActive('bulletList'), () =>
        editor.chain().focus().toggleBulletList().run()
      )}
      {btn('1. List', editor.isActive('orderedList'), () =>
        editor.chain().focus().toggleOrderedList().run()
      )}
      {btn('❝', editor.isActive('blockquote'), () =>
        editor.chain().focus().toggleBlockquote().run()
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#f1f5f9', color: '#64748b' },
    processing: { bg: '#fef3c7', color: '#92400e' },
    ready: { bg: '#dcfce7', color: '#166534' },
    published: { bg: '#dbeafe', color: '#1e40af' },
  };
  const s = styles[status] ?? { bg: '#f1f5f9', color: '#6b7280' };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;
  const map = {
    saving: { text: 'Saving…', color: 'var(--muted-foreground)' },
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
