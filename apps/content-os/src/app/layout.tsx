import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content OS',
  description: 'Create once, distribute everywhere',
};

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/content', label: 'Content' },
  { href: '/podcasts', label: 'Podcasts' },
  { href: '/queue', label: 'Queue' },
  { href: '/accounts', label: 'Channels' },
  { href: '/analytics', label: 'Analytics' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen">
          {/* Sidebar */}
          <nav
            className="w-56 shrink-0 flex flex-col py-4 px-3"
            style={{ borderRight: '1px solid var(--border)', background: 'var(--card)' }}
          >
            <div className="px-3 mb-6">
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
                Content OS
              </h1>
            </div>
            <div className="flex-1 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--foreground)' }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
