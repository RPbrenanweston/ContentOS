// @crumb input-ui
// [UI] | Form input | Text field primitive
// why: Reusable input component for text fields throughout studio
// in:[value, onChange, placeholder, type] out:[input DOM, text content] err:[input, validation errors]
// hazard: No input validation built-in—validation logic scattered across forms
// hazard: No accessible error state indicator—errors may not be conveyed to screen readers
// edge:apps/studio/src/components/logbook/AnnotationField.tsx -> SERVES
// prompt: Add validation prop support, implement accessible error message slots

'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({
  label,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1 font-heading text-[11px] font-semibold uppercase tracking-tight text-muted"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full bg-transparent text-text font-mono text-[14px]',
          'border-0 border-b border-transparent',
          'focus:border-b focus:border-primary',
          'outline-none transition-colors duration-150',
          'placeholder:text-muted',
          'py-2',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  );
}
