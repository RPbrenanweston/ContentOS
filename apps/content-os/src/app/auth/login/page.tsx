'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const LIME = '#D4F85A';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState('sending');
    setErrorMsg('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setState('error');
        return;
      }

      setState('sent');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setState('error');
    }
  };

  return (
    <div
      className="w-full max-w-sm mx-auto p-8 rounded-xl"
      style={{
        backgroundColor: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--theme-foreground)' }}
        >
          Content OS
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--theme-muted)' }}>
          Sign in with a magic link
        </p>
      </div>

      {state === 'sent' ? (
        /* Success state */
        <div className="text-center py-4">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: `${LIME}20` }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={LIME}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--theme-foreground)' }}
          >
            Check your email
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
            We sent a magic link to <strong style={{ color: 'var(--theme-foreground)' }}>{email}</strong>.
            Click the link in the email to sign in.
          </p>
          <button
            onClick={() => {
              setState('idle');
              setEmail('');
            }}
            className="mt-6 text-xs underline"
            style={{ color: 'var(--theme-muted)' }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        /* Form state */
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="email"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--theme-muted)' }}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--theme-background)',
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-foreground)',
            }}
          />

          {state === 'error' && errorMsg && (
            <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={state === 'sending' || !email.trim()}
            className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: LIME, color: '#1a1a1a' }}
          >
            {state === 'sending' ? 'Sending...' : 'Send magic link'}
          </button>

          <p
            className="text-center text-xs mt-4"
            style={{ color: 'var(--theme-muted)' }}
          >
            No account? One will be created automatically.
          </p>
        </form>
      )}
    </div>
  );
}
