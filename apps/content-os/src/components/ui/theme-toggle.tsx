// @crumb theme-toggle-control
// UI | appearance-control | client-side-toggle
// why: Manages user light/dark theme preference; persists selection to localStorage and applies classes to document root for CSS variable switching
// in:[click-event] out:[DOM-class-applied, localStorage-updated] err:[none-critical]
// hazard: localStorage access not wrapped in try-catch; blocks on localStorage.getItem if browser has localStorage API issues
// hazard: document.documentElement.classList modified directly without checking if 'light' class already exists; potential duplicate application
// hazard: No validation on stored theme value; accepts any string from localStorage without format check
// hazard: Race condition: useEffect reads stored state but toggle() updates it; rapid toggles could desync UI from localStorage
// hazard: Hard-coded class name 'light' scattered across component; refactoring class strategy would require multiple edits
// hazard: CSS variable fallback not checked; if --theme-muted is undefined, button color becomes transparent
// edge:../../app/layout.tsx -> SERVES
// prompt: Wrap localStorage access in try-catch; validate theme value against allowed set (light|dark); consolidate class name as constant; debounce toggle() calls
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      setIsLight(true);
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggle = () => {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md transition-colors hover:opacity-80"
      style={{ color: 'var(--theme-muted)' }}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {isLight ? (
        /* Moon icon — switch to dark */
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        /* Sun icon — switch to light */
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}
