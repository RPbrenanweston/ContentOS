'use client';

/**
 * Auth layout — minimal centered layout WITHOUT the app sidebar.
 * Used for login, signup, and other unauthenticated flows.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'var(--theme-background)' }}
    >
      {children}
    </div>
  );
}
