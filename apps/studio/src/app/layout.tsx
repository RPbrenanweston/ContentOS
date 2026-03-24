// @crumb studio-root-layout
// [UI] | Root layout wrapper | App shell
// why: Establishes global metadata, styles, and providers for entire studio app
// in:[page context, child routes] out:[HTML document, theme context] err:[render errors]
// hazard: Missing error boundary for unhandled exceptions in child routes
// hazard: Metadata not validated—could expose sensitive URLs or API endpoints in robots/sitemap
// edge:apps/studio/src/app/console/page.tsx -> SERVES
// prompt: Add error boundary, validate metadata before deployment, consider auth-gated public routes

import type { Metadata } from 'next';
import { Archivo, Space_Mono } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BREADCRUMB STUDIO',
  description: 'High-speed video capture console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen bg-background text-text font-body antialiased">
        {children}
      </body>
    </html>
  );
}
