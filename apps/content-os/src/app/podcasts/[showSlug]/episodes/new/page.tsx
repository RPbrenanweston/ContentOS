'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

type UploadState =
  | { step: 'upload' }
  | { step: 'uploading'; progress: number; filename: string }
  | { step: 'metadata'; storagePath: string; publicUrl: string; filename: string };

interface ShowInfo {
  id: string;
  slug: string;
  title: string;
}

export default function NewEpisodePage() {
  const router = useRouter();
  const params = useParams<{ showSlug: string }>();
  const showSlug = params.showSlug;

  const [state, setState] = useState<UploadState>({ step: 'upload' });
  const [show, setShow] = useState<ShowInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Fetch show info (need the UUID for API calls)
  useEffect(() => {
    async function loadShow() {
      try {
        const res = await fetch('/api/podcast/shows');
        const json = await res.json();
        if (json.data) {
          const found = json.data.find(
            (s: ShowInfo) => s.slug === showSlug,
          );
          if (found) setShow(found);
        }
      } catch {
        // Ignore — page will show error on submit
      }
    }
    loadShow();
  }, [showSlug]);

  const acceptedTypes = [
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'audio/ogg',
    'audio/flac',
  ];
  const acceptStr = '.mp3,.m4a,.wav,.ogg,.flac';

  const uploadFile = useCallback(
    async (file: File) => {
      if (!show) {
        setError('Show not loaded yet. Please wait.');
        return;
      }

      // Validate type
      if (!acceptedTypes.includes(file.type) && !acceptStr.split(',').some((ext) => file.name.toLowerCase().endsWith(ext))) {
        setError('Unsupported file type. Please upload MP3, M4A, WAV, OGG, or FLAC.');
        return;
      }

      setError(null);
      setState({ step: 'uploading', progress: 0, filename: file.name });

      try {
        // Step 1: Get signed upload URL
        const signedRes = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'audio/mpeg',
            showId: show.id,
          }),
        });
        const signedJson = await signedRes.json();

        if (!signedRes.ok) {
          setError(signedJson.error ?? 'Failed to get upload URL');
          setState({ step: 'upload' });
          return;
        }

        const { uploadUrl, storagePath, publicUrl } = signedJson;

        // Step 2: Upload file directly to Supabase Storage with progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setState({ step: 'uploading', progress: pct, filename: file.name });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(file);
        });

        // Step 3: Move to metadata step
        setState({ step: 'metadata', storagePath, publicUrl, filename: file.name });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setState({ step: 'upload' });
      }
    },
    [show],
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleMetadataSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.step !== 'metadata' || !show) return;

    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get('title') as string,
      description: (form.get('description') as string) || undefined,
      episode_number: form.get('episode_number')
        ? Number(form.get('episode_number'))
        : undefined,
      season_number: form.get('season_number')
        ? Number(form.get('season_number'))
        : undefined,
      episode_type: form.get('episode_type') as string,
      explicit: form.get('explicit') === 'on',
      show_notes: (form.get('show_notes') as string) || undefined,
      media_url: state.publicUrl,
    };

    try {
      const res = await fetch(`/api/podcast/shows/${show.id}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to create episode');
        setSaving(false);
        return;
      }

      router.push(`/podcasts/${showSlug}`);
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
      <h1 className="text-xl font-semibold mb-1">New Episode</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
        {show ? show.title : 'Loading show...'}
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        <StepIndicator
          number={1}
          label="Upload audio"
          active={state.step === 'upload' || state.step === 'uploading'}
          done={state.step === 'metadata'}
        />
        <div
          className="flex-1 h-px"
          style={{ background: state.step === 'metadata' ? '#CBFF53' : 'var(--border)' }}
        />
        <StepIndicator
          number={2}
          label="Episode details"
          active={state.step === 'metadata'}
          done={false}
        />
      </div>

      {error && (
        <div
          className="rounded-md px-4 py-3 mb-6 text-sm"
          style={{
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {(state.step === 'upload' || state.step === 'uploading') && (
        <div
          ref={dropRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-20 text-center transition-colors cursor-pointer"
          style={{
            borderColor: dragging ? '#CBFF53' : 'var(--border)',
            background: dragging ? 'rgba(203, 255, 83, 0.05)' : 'transparent',
          }}
          onClick={() => state.step === 'upload' && fileInputRef.current?.click()}
        >
          {state.step === 'uploading' ? (
            <>
              <p className="text-sm font-medium mb-2">
                Uploading {state.filename}...
              </p>
              <div
                className="w-64 h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${state.progress}%`,
                    background: '#CBFF53',
                  }}
                />
              </div>
              <p
                className="text-xs mt-2"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {state.progress}%
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium mb-1">
                Drop audio file here or click to browse
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Supports MP3, M4A, WAV, OGG, FLAC
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptStr}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Step 2: Metadata */}
      {state.step === 'metadata' && (
        <div>
          <div
            className="rounded-md px-4 py-3 mb-6 text-sm flex items-center gap-2"
            style={{
              background: 'rgba(203, 255, 83, 0.1)',
              border: '1px solid #CBFF53',
            }}
          >
            <span>Audio uploaded:</span>
            <span className="font-medium">{state.filename}</span>
          </div>

          <form onSubmit={handleMetadataSubmit} className="space-y-5">
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
                placeholder="Episode title"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53] resize-y"
                style={inputStyle}
                placeholder="Brief episode description"
              />
            </div>

            {/* Episode number + Season number row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="episode_number"
                  className="block text-sm font-medium mb-1"
                >
                  Episode #
                </label>
                <input
                  id="episode_number"
                  name="episode_number"
                  type="number"
                  min="1"
                  className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="season_number"
                  className="block text-sm font-medium mb-1"
                >
                  Season #
                </label>
                <input
                  id="season_number"
                  name="season_number"
                  type="number"
                  min="1"
                  className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="episode_type"
                  className="block text-sm font-medium mb-1"
                >
                  Type
                </label>
                <select
                  id="episode_type"
                  name="episode_type"
                  className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53]"
                  style={inputStyle}
                  defaultValue="full"
                >
                  <option value="full">Full</option>
                  <option value="trailer">Trailer</option>
                  <option value="bonus">Bonus</option>
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

            {/* Show notes */}
            <div>
              <label
                htmlFor="show_notes"
                className="block text-sm font-medium mb-1"
              >
                Show notes
              </label>
              <textarea
                id="show_notes"
                name="show_notes"
                rows={4}
                className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#CBFF53] resize-y"
                style={inputStyle}
                placeholder="Links, timestamps, credits..."
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ background: '#CBFF53', color: '#1a1a1a' }}
              >
                {saving ? 'Creating...' : 'Create episode'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2 rounded-md text-sm font-medium"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  done,
}: {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  const bg = done ? '#CBFF53' : active ? '#CBFF53' : 'var(--border)';
  const textColor = done || active ? '#1a1a1a' : 'var(--muted-foreground)';

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
        style={{ background: bg, color: textColor }}
      >
        {done ? '\u2713' : number}
      </div>
      <span
        className="text-sm font-medium"
        style={{ color: active || done ? 'var(--foreground)' : 'var(--muted-foreground)' }}
      >
        {label}
      </span>
    </div>
  );
}
