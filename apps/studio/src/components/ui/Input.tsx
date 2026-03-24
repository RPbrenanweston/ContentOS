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
