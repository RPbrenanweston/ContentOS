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
