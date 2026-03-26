'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PenLine,
  LayoutList,
  CalendarDays,
  FileText,
  ListOrdered,
  Globe,
  BarChart2,
  Mic2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  {
    items: [
      { href: '/content/new', label: 'Create',   icon: PenLine },
      { href: '/plan',        label: 'Plan',      icon: LayoutList },
      { href: '/calendar',    label: 'Calendar',  icon: CalendarDays },
      { href: '/drafts',      label: 'Drafts',    icon: FileText },
      { href: '/queue',       label: 'Queue',     icon: ListOrdered },
    ],
  },
  {
    items: [
      { href: '/podcasts',  label: 'Podcasts', icon: Mic2 },
      { href: '/accounts',  label: 'Channels', icon: Globe },
      { href: '/analytics', label: 'Insights', icon: BarChart2 },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex-1 px-2 py-1 space-y-4">
      {NAV_SECTIONS.map((section, i) => (
        <div key={i}>
          {i > 0 && (
            <div
              className="mx-2 mb-3"
              style={{ height: '1px', backgroundColor: 'var(--theme-border)' }}
            />
          )}
          <div className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/content/new'
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + '/');

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors',
                    'hover:bg-[var(--theme-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CBFF53]',
                    isActive
                      ? 'bg-[var(--theme-border)] text-[var(--theme-foreground)]'
                      : 'text-[var(--theme-muted)] hover:text-[var(--theme-foreground)]',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
