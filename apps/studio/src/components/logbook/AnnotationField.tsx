'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface AnnotationFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function AnnotationField({ value, onChange }: AnnotationFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
        setSaved(true);
        setTimeout(() => setSaved(false), 800);
      }, 500);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <textarea
        value={localValue}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Add annotation..."
        rows={1}
        className={`
          w-full bg-transparent text-text font-body text-sm
          border-0 border-b border-transparent
          focus:border-b focus:border-primary focus:outline-none
          placeholder:text-muted/50
          resize-none
          py-1
        `}
      />
      {saved && (
        <span className="absolute right-0 top-1 font-mono text-[10px] text-primary">
          SAVED
        </span>
      )}
    </div>
  );
}
