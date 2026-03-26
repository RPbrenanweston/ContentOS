'use client';

// @crumb image-editor-page
// UI | image-editor | entry-point
// why: Canva-style entry: template picker leads into Fabric.js canvas editor
// in:[user-interaction] out:[JSX-editor-layout] err:[canvas-init-failure]
// hazard: Fabric.js requires browser APIs — must be client component with dynamic import guard
// hazard: Canvas disposal on unmount critical to prevent memory leaks
// edge:../../../components/image-editor/TemplatePicker.tsx -> USES
// edge:../../../components/image-editor/ImageEditorCanvas.tsx -> USES
// edge:../../../components/image-editor/ImageEditorToolbar.tsx -> USES
// edge:../../../components/image-editor/ImageEditorSidebar.tsx -> USES
// edge:../../../components/image-editor/useImageEditor.ts -> USES
// prompt: Verify template picker renders on load, canvas initialises at correct dimensions after selection

import { useState, useCallback } from 'react';
import {
  ImageEditorCanvas,
  ImageEditorToolbar,
  ImageEditorSidebar,
  useImageEditor,
} from '@/components/image-editor';
import { TemplatePicker } from '@/components/image-editor/TemplatePicker';
import type { SelectedTemplate } from '@/components/image-editor/TemplatePicker';

export default function ImageEditorPage() {
  const editor = useImageEditor();
  const [activeTemplate, setActiveTemplate] = useState<SelectedTemplate | null>(null);

  const handleTemplateSelect = useCallback(
    (template: SelectedTemplate) => {
      // Set dimensions on the hook before the canvas mounts so initCanvas uses the right size
      editor.setCanvasSize(template.width, template.height);
      setActiveTemplate(template);
    },
    [editor],
  );

  const handleBackToTemplates = useCallback(() => {
    editor.disposeCanvas();
    setActiveTemplate(null);
  }, [editor]);

  // ── Template picker (no canvas active) ──────────────────────────────────
  if (!activeTemplate) {
    return <TemplatePicker onSelect={handleTemplateSelect} />;
  }

  // ── Editor view (canvas active) ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar — includes back link + template context */}
      <ImageEditorToolbar
        editor={editor}
        templateName={activeTemplate.name}
        onBackToTemplates={handleBackToTemplates}
      />

      {/* Main area: canvas + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ImageEditorCanvas editor={editor} />
        <ImageEditorSidebar editor={editor} />
      </div>
    </div>
  );
}
