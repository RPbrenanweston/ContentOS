import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { DistributionAccount, PlatformType } from '@/domain';

// ─── Platform metadata ────────────────────────────────────

interface PlatformMeta {
  id: PlatformType;
  label: string;
  icon: string;
  color: string;
  description: string;
  oauthUrl: string | null;
}

const PLATFORMS: PlatformMeta[] = [
  { id: 'twitter',   label: 'X / Twitter',  icon: '\uD835\uDD4F', color: '#000000', description: 'Short-form posts & threads',        oauthUrl: '/api/oauth/twitter/authorize' },
  { id: 'linkedin',  label: 'LinkedIn',      icon: 'in',           color: '#0077B5', description: 'Professional network posts',         oauthUrl: '/api/oauth/linkedin/authorize' },
  { id: 'instagram', label: 'Instagram',     icon: '\u25FB',       color: '#E1306C', description: 'Photos, Stories & Reels',            oauthUrl: null },
  { id: 'youtube',   label: 'YouTube',       icon: '\u25B6',       color: '#FF0000', description: 'Video content & Shorts',             oauthUrl: null },
  { id: 'tiktok',    label: 'TikTok',        icon: '\u266A',       color: '#000000', description: 'Short-form video',                   oauthUrl: null },
  { id: 'facebook',  label: 'Facebook',      icon: 'f',            color: '#1877F2', description: 'Pages, groups & stories',            oauthUrl: '/api/oauth/facebook/authorize' },
  { id: 'threads',   label: 'Threads',       icon: '@',            color: '#000000', description: 'Text-based conversations',           oauthUrl: null },
  { id: 'bluesky',   label: 'Bluesky',       icon: '\u2601',       color: '#0085FF', description: 'Decentralized social',               oauthUrl: null },
];

// ─── Page ─────────────────────────────────────────────────

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = user
    ? await supabase
        .from('distribution_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    : { data: null };

  const connectedAccounts: DistributionAccount[] = accounts ?? [];
  const connectedPlatforms = new Set(connectedAccounts.map((a) => a.platform));

  const params = await searchParams;
  const connected = typeof params.connected === 'string' ? params.connected : null;
  const disconnected = params.disconnected === 'true';
  const errorParam = typeof params.error === 'string' ? params.error : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="h-14 flex items-center justify-between px-6 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <h1
            className="text-lg font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Channels
          </h1>
          <span
            className="text-xs"
            style={{ color: 'var(--muted)' }}
          >
            {connectedAccounts.length} connected
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-6">
          {/* Success banner */}
          {connected && (
            <div
              className="mb-6 px-4 py-3 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--success)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              {connected.charAt(0).toUpperCase() + connected.slice(1)} connected
              successfully!
            </div>
          )}

          {disconnected && (
            <div
              className="mb-6 px-4 py-3 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--success)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              Account disconnected.
            </div>
          )}

          {/* Error banner */}
          {errorParam && (
            <div
              className="mb-6 px-4 py-3 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {errorParam}
            </div>
          )}

          {/* ── Connected Accounts ── */}
          {connectedAccounts.length > 0 && (
            <div className="mb-10">
              <h2
                className="text-sm font-semibold mb-4"
                style={{ color: 'var(--foreground)' }}
              >
                Connected
              </h2>
              <div className="space-y-3">
                {connectedAccounts.map((account) => {
                  const meta = PLATFORMS.find((p) => p.id === account.platform);
                  const healthy = account.consecutive_failures === 0;

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Platform icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                          style={{
                            backgroundColor: meta
                              ? `${meta.color}15`
                              : 'var(--card)',
                            color: meta?.color ?? 'var(--foreground)',
                          }}
                        >
                          {account.platform_avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={account.platform_avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            meta?.icon ?? account.platform.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--foreground)' }}
                          >
                            {account.platform_display_name ??
                              account.platform_username ??
                              account.platform}
                          </p>
                          {account.platform_username && (
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: 'var(--muted)' }}
                            >
                              @{account.platform_username}
                            </p>
                          )}
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: 'var(--muted)' }}
                          >
                            Connected{' '}
                            {new Date(account.created_at).toLocaleDateString(
                              'en-US',
                              { month: 'short', day: 'numeric', year: 'numeric' },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Health indicator */}
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: healthy
                              ? 'rgba(16, 185, 129, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
                            color: healthy
                              ? 'var(--success)'
                              : 'var(--error)',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: healthy
                                ? 'var(--success)'
                                : 'var(--error)',
                            }}
                          />
                          {healthy ? 'Active' : 'Failing'}
                        </span>

                        {/* Disconnect */}
                        <form
                          action={`/accounts/disconnect/${account.id}`}
                          method="POST"
                        >
                          <button
                            type="submit"
                            className="text-xs px-2.5 py-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--muted)' }}
                          >
                            Disconnect
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Connect Platform Grid ── */}
          <div>
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: 'var(--foreground)' }}
            >
              {connectedAccounts.length > 0
                ? 'Add channel'
                : 'Connect your first channel'}
            </h2>
            {connectedAccounts.length === 0 && (
              <p
                className="text-sm mb-6"
                style={{ color: 'var(--muted)' }}
              >
                Connect where your audience lives. Write once here, and
                distribute everywhere.
              </p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PLATFORMS.map((platform) => {
                const alreadyConnected = connectedPlatforms.has(platform.id);
                const comingSoon = !platform.oauthUrl;
                const disabled = alreadyConnected || comingSoon;

                return (
                  <div
                    key={platform.id}
                    className="rounded-lg p-4 flex flex-col gap-3"
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--card-border)',
                      opacity: disabled ? 0.45 : 1,
                    }}
                  >
                    {/* Icon + name */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          backgroundColor: `${platform.color}15`,
                          color: platform.color,
                        }}
                      >
                        {platform.icon}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {platform.label}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: 'var(--muted)' }}
                        >
                          {platform.description}
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    {alreadyConnected ? (
                      <span
                        className="text-xs font-medium text-center py-1.5 rounded-md"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--success)',
                        }}
                      >
                        Connected
                      </span>
                    ) : comingSoon ? (
                      <span
                        className="text-xs font-medium text-center py-1.5 rounded-md"
                        style={{
                          backgroundColor: 'var(--card)',
                          color: 'var(--muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Coming soon
                      </span>
                    ) : (
                      <a
                        href={platform.oauthUrl!}
                        className="text-xs font-semibold text-center py-1.5 rounded-md transition-opacity hover:opacity-90"
                        style={{
                          backgroundColor: '#CBFF53',
                          color: '#000000',
                        }}
                      >
                        Connect
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
