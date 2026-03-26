'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Technology',
  'Business',
  'Education',
  'Entertainment',
  'Health',
  'News',
  'Society & Culture',
  'Comedy',
  'Sports',
  'Science',
  'Arts',
  'Music',
  'TV & Film',
  'True Crime',
  'History',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
];

export default function NewPodcastShowPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get('title') as string,
      description: form.get('description') as string,
      author: form.get('author') as string,
      category: form.get('category') as string,
      language: form.get('language') as string,
      explicit: form.get('explicit') === 'on',
      artwork_url: (form.get('artwork_url') as string) || '',
      owner_name: form.get('owner_name') as string,
      owner_email: form.get('owner_email') as string,
    };

    try {
      const res = await fetch('/api/podcast/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to create show');
        setSaving(false);
        return;
      }

      router.push(`/podcasts/${json.data.slug}`);
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--background)',
    color: 'var(--foreground)',
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">New Podcast Show</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
        Set up your show details. You can change these later.
      </p>

      {error && (
        <div
          className="rounded-md px-4 py-3 mb-6 text-sm"
          style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
            style={inputStyle}
            placeholder="My Awesome Podcast"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53] resize-y"
            style={inputStyle}
            placeholder="What is your podcast about?"
          />
        </div>

        {/* Author */}
        <div>
          <label htmlFor="author" className="block text-sm font-medium mb-1">
            Author <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="author"
            name="author"
            type="text"
            required
            className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
            style={inputStyle}
            placeholder="Author or host name"
          />
        </div>

        {/* Category + Language row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">
              Category <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="category"
              name="category"
              required
              className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
              style={inputStyle}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="language" className="block text-sm font-medium mb-1">
              Language <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="language"
              name="language"
              required
              className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
              style={inputStyle}
            >
              <option value="">Select language</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Explicit */}
        <div className="flex items-center gap-2">
          <input
            id="explicit"
            name="explicit"
            type="checkbox"
            className="rounded"
          />
          <label htmlFor="explicit" className="text-sm">
            Contains explicit content
          </label>
        </div>

        {/* Artwork URL */}
        <div>
          <label htmlFor="artwork_url" className="block text-sm font-medium mb-1">
            Artwork URL
          </label>
          <input
            id="artwork_url"
            name="artwork_url"
            type="url"
            className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
            style={inputStyle}
            placeholder="https://example.com/artwork.jpg"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Square image recommended (1400x1400 - 3000x3000 px). File upload coming in Phase 3.
          </p>
        </div>

        {/* Owner name + email row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="owner_name" className="block text-sm font-medium mb-1">
              Owner name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="owner_name"
              name="owner_name"
              type="text"
              required
              className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
              style={inputStyle}
              placeholder="Your name (for RSS feed)"
            />
          </div>
          <div>
            <label htmlFor="owner_email" className="block text-sm font-medium mb-1">
              Owner email <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="owner_email"
              name="owner_email"
              type="email"
              required
              className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#CBFF53', color: '#1a1a1a' }}
          >
            {saving ? 'Creating...' : 'Create show'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 rounded-md text-sm font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
