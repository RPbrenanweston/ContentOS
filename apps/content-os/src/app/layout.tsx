// @crumb app-root-layout
// UI | root-layout | entry-point
// why: Establishes app shell with persistent sidebar navigation and theme context for all routes
// in:[metadata-config] out:[JSX-html-document] err:[none-critical]
// hazard: Theme-dependent styling with CSS variables could break if color tokens renamed
// hazard: NavItem icon prop typing uses React.FC, vulnerable to icon component signature changes
// hazard: suppressHydrationWarning on html element masks potential hydration mismatches
// edge:../../components/ui/theme-toggle.tsx -> USES
// edge:./globals.css -> IMPORTS
// edge:../components/error-boundary.tsx -> USES
// prompt: Validate CSS variable names match theme system; test hydration with client-side theme logic

import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ErrorBoundary } from '@/components/error-boundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content OS',
  description: 'Write once, reach everywhere — a creation optimizer for authentic creators',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Archivo:wght@400;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('theme') === 'light') {
              document.documentElement.classList.add('light');
            }
          } catch (e) {}
        `}} />
      </head>
      <body className="min-h-screen" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}>
        <div className="flex h-screen">
          {/* Sidebar */}
          <nav className="w-[220px] flex flex-col" style={{ borderRight: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}>
            <div className="p-5 pb-4">
              <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--theme-foreground)' }}>
                Content OS
              </h1>
              <p className="text-ui-sm mt-0.5">Write once, reach everywhere</p>
            </div>

            <div className="flex-1 px-2 space-y-0.5">
              <NavItem href="/content/new" label="Create" icon={PenIcon} />
              <NavItem href="/plan" label="Plan" icon={PlanIcon} />
              <NavItem href="/calendar" label="Calendar" icon={CalendarIcon} />
              <NavItem href="/drafts" label="Drafts" icon={DraftsIcon} />
              <NavItem href="/queue" label="Queue" icon={QueueIcon} />

              <div className="mx-2 my-3" style={{ height: '1px', backgroundColor: 'var(--theme-border)' }} />

              <NavItem href="/accounts" label="Channels" icon={ChannelsIcon} />
              <NavItem href="/analytics" label="Insights" icon={InsightsIcon} />
            </div>

            <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--theme-border)' }}>
              <span className="text-ui-sm">v0.2.0</span>
              <ThemeToggle />
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--theme-background)' }}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </body>
    </html>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      className="nav-item flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium"
    >
      <Icon className="w-4 h-4" />
      {label}
    </a>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6" /><path d="M9 16h6" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function PiecesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h12" />
    </svg>
  );
}

function DraftsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </svg>
  );
}

function ChannelsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function InsightsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
