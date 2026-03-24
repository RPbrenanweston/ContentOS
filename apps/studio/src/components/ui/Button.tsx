'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-background hover:brightness-90',
  ghost:
    'bg-transparent text-text hover:bg-surface',
  danger:
    'bg-accent text-white hover:brightness-90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-[12px]',
  md: 'px-5 py-2 text-[13px]',
  lg: 'px-7 py-3 text-[14px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center',
        'rounded-none border-none outline-none',
        'font-heading font-semibold uppercase tracking-tight',
        'transition-all duration-100',
        'active:scale-[0.97]',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
