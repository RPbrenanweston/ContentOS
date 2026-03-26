import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content OS',
  description: 'Create once, distribute everywhere',
};

const navItems = [
  { href: '/content/new', label: 'Create', icon: '\u270F\uFE0F' },
  { href: '/plan', label: 'Plan', icon: '\uD83D\uDCCB' },
  { href: '/calendar', label: 'Calendar', icon: '\uD83D\uDCC5' },
  { href: '/drafts', label: 'Drafts', icon: '\uD83D\uDCC4' },
  { href: '/queue', label: 'Queue', icon: '\u23F3' },
];

const bottomNav = [
  { href: '/accounts', label: 'Channels', icon: '\uD83C\uDF10' },
  { href: '/analytics', label: 'Insights', icon: '\uD83D\uDCCA' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen">
          {/* Sidebar */}
          <nav
            className="w-[185px] shrink-0 flex flex-col py-5 px-3"
            style={{ borderRight: '1px solid var(--border)', background: 'var(--card)' }}
          >
            {/* Logo area */}
            <div className="px-3 mb-8">
              <h1
                className="text-base font-bold tracking-tight"
                style={{ color: 'var(--foreground)' }}
              >
                Content OS
              </h1>
              <p
                className="text-[11px] mt-0.5 leading-tight"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Write once, reach everywhere
              </p>
            </div>

            {/* Main nav */}
            <div className="flex-1 space-y-0.5">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--foreground)' }}
                >
                  <span className="text-sm w-5 text-center">{item.icon}</span>
                  {item.label}
                </a>
              ))}

              {/* Divider */}
              <div
                className="my-3 mx-3"
                style={{ borderTop: '1px solid var(--border)' }}
              />

              {bottomNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--foreground)' }}
                >
                  <span className="text-sm w-5 text-center">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-h-0 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
