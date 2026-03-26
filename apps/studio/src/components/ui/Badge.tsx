// @crumb badge-ui
// [UI] | Label tag | Status indicator
// why: Badge/label component for displaying status, tags, and indicators
// in:[children, variant, className] out:[badge DOM, styling] err:[render errors]
// hazard: No accessibility labels—screen readers can't describe badge purpose
// hazard: Colors may fail contrast test for accessibility compliance
// edge:apps/studio/src/components/logbook/MarkerCard.tsx -> SERVES
// prompt: Add aria-label support, verify WCAG AA color contrast on all variants

'use client';

import React from 'react';

type BadgeVariant = 'active' | 'muted' | 'error';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  active: 'text-primary',
  muted: 'text-muted',
  error: 'text-accent',
};

export function Badge({
  children,
  variant = 'muted',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-block font-mono text-[12px] leading-none',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      [{children}]
    </span>
  );
}
