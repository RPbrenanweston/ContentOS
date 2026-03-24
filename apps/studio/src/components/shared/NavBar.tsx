'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavBarProps {
  videoId?: string;
}

export function NavBar({ videoId }: NavBarProps) {
  const pathname = usePathname();

  const links = [
    { label: 'CONSOLE', href: videoId ? `/console/${videoId}` : '/console', prefix: '/console' },
    { label: 'LOGBOOK', href: videoId ? `/logbook/${videoId}` : '#', prefix: '/logbook', disabled: !videoId },
    { label: 'ASSEMBLY', href: videoId ? `/assembly/${videoId}` : '#', prefix: '/assembly', disabled: !videoId },
    { label: 'ARCHIVE', href: '/archive', prefix: '/archive' },
  ];

  return (
    <nav className="flex items-center gap-0 border-b border-border bg-background">
      <div className="px-4 py-2 border-r border-border">
        <span className="font-heading font-bold text-xs text-primary tracking-[0.2em]">
          BREADCRUMB
        </span>
      </div>
      {links.map((link) => {
        const isActive = pathname.startsWith(link.prefix);
        return (
          <Link
            key={link.label}
            href={link.disabled ? '#' : link.href}
            className={`
              px-4 py-2 border-r border-border
              font-heading font-semibold text-[13px] uppercase tracking-[0.1em]
              transition-colors no-underline
              ${isActive ? 'text-primary bg-surface' : 'text-muted hover:text-text'}
              ${link.disabled ? 'opacity-30 pointer-events-none' : ''}
            `}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
