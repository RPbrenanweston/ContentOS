// @crumb tiptap-editor
// UI | Rich-text editing | Content composition | Bubble menu formatting
// why: Distraction-free and feature-rich editor modes for blog and custom content authoring
// in:[content, onChange, placeholder, mode] out:[HTML string, plain text] err:[editor null, extension config error]
// hazard: Unvalidated HTML output from editor.getHTML() could expose XSS if sanitization is missing downstream
// hazard: Image prompt URL input has no validation—malicious URLs could trigger CSRF or load tracking pixels
// edge:../content/status-badge.tsx -> RELATES [status display]
// edge:../../hooks/use-voice-input.ts -> SERVES [voice input could feed editor content]
// edge:../../domain/derived-asset.ts -> WRITES [editor content becomes asset body]
// prompt: Ensure HTML output sanitization before storage. Add URL validation for image insertion. Document write/edit mode differences.

'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useCallback, forwardRef, useImperativeHandle } from 'react';

interface TipTapEditorProps {
  content?: string;
  onChange?: (html: string, text: string) => void;
  placeholder?: string;
  editable?: boolean;
  /** 'write' = distraction-free, no formatting tools. 'edit' = full formatting toolbar. */
  mode?: 'write' | 'edit';
}

export interface TipTapEditorHandle {
  insertText: (text: string) => void;
}

export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(function TipTapEditor({
  content = '',
  onChange,
  placeholder = 'Tell your story...',
  editable = true,
  mode = 'write',
}, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: mode === 'edit' ? { levels: [1, 2, 3] } : false,
        codeBlock: mode === 'edit'
          ? {
              HTMLAttributes: {
                class: 'font-mono text-sm',
                style: 'background: var(--theme-surface); border: 1px solid var(--theme-border); padding: 1em; border-radius: 6px;',
              },
            }
          : false,
        blockquote: mode === 'edit' ? {} : false,
        bulletList: mode === 'edit' ? {} : false,
        orderedList: mode === 'edit' ? {} : false,
        horizontalRule: mode === 'edit' ? {} : false,
        bold: mode === 'edit' ? {} : false,
        italic: mode === 'edit' ? {} : false,
        strike: mode === 'edit' ? {} : false,
        code: mode === 'edit' ? {} : false,
      }),
      Placeholder.configure({ placeholder }),
      ...(mode === 'edit' ? [Image.configure({ inline: false, allowBase64: true })] : []),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose-editor min-h-[60vh] py-8 px-6 focus:outline-none',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML(), e.getText());
    },
  });

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(text).run();
    },
  }), [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Bubble menu — only in edit mode */}
      {mode === 'edit' && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 150 }}
          className="flex items-center gap-0.5 rounded-lg shadow-lg px-1 py-1"
          style={{ backgroundColor: 'var(--theme-bubble-bg)' }}
        >
          <BubbleButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </BubbleButton>
          <BubbleDivider />
          <BubbleButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </BubbleButton>
          <BubbleDivider />
          <BubbleButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            &ldquo;
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            &bull;
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {'<>'}
          </BubbleButton>
          <BubbleDivider />
          <BubbleButton active={false} onClick={addImage}>
            Img
          </BubbleButton>
        </BubbleMenu>
      )}

      {/* Editor area — clean, centered */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[780px] mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});

function BubbleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
      style={{
        backgroundColor: active ? 'var(--theme-bubble-active-bg)' : 'transparent',
        color: active ? 'var(--theme-bubble-active-text)' : 'var(--theme-bubble-text)',
      }}
    >
      {children}
    </button>
  );
}

function BubbleDivider() {
  return <div className="w-px h-4 mx-0.5" style={{ backgroundColor: 'var(--theme-bubble-divider)' }} />;
}
