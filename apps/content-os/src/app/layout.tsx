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
import { SidebarNav } from '@/components/ui/sidebar-nav';
import { ErrorBoundary } from '@/components/error-boundary';
import { QuickCaptureModalProvider } from '@/components/QuickCaptureModalProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content OS',
  description: 'Write once, reach everywhere — a creation optimizer for authentic creators',
  manifest: '/manifest.json',
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

            <SidebarNav />

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
        <QuickCaptureModalProvider />
      </body>
    </html>
  );
}

