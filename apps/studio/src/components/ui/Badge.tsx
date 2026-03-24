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
