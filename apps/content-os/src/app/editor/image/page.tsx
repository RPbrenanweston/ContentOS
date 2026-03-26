'use client';

// @crumb image-editor-page
// UI | image-editor | entry-point
// why: Full-screen Fabric.js canvas editor for creating social media images with configurable dimensions
// in:[user-interaction] out:[JSX-editor-layout] err:[canvas-init-failure]
// hazard: Fabric.js requires browser APIs — must be client component with dynamic import guard
// hazard: Canvas disposal on unmount critical to prevent memory leaks
// edge:../../../components/image-editor/ImageEditorCanvas.tsx -> USES
// edge:../../../components/image-editor/ImageEditorToolbar.tsx -> USES
// edge:../../../components/image-editor/ImageEditorSidebar.tsx -> USES
// edge:../../../components/image-editor/useImageEditor.ts -> USES
// prompt: Verify canvas initializes at correct dimensions; test zoom/pan interactions

import {
  ImageEditorCanvas,
  ImageEditorToolbar,
  ImageEditorSidebar,
  useImageEditor,
} from '@/components/image-editor';

export default function ImageEditorPage() {
  const editor = useImageEditor();

  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <ImageEditorToolbar editor={editor} />

      {/* Main area: canvas + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center canvas area */}
        <ImageEditorCanvas editor={editor} />

        {/* Right sidebar */}
        <ImageEditorSidebar editor={editor} />
      </div>
    </div>
  );
}
