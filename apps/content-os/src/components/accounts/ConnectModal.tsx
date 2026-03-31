'use client'

interface ConnectModalProps {
  platform: {
    id: string
    label: string
    icon: string
    color: string
    oauthUrl: string
  }
  mode: 'connect' | 'reconnect'
  existingAccountId?: string
  onClose: () => void
}

export function ConnectModal({ platform, mode, existingAccountId, onClose }: ConnectModalProps) {
  const handleAuthorize = () => {
    if (mode === 'reconnect' && existingAccountId) {
      window.location.href = platform.oauthUrl + '?reconnect=' + existingAccountId
    } else {
      window.location.href = platform.oauthUrl
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          maxWidth: 448,
          width: '90%',
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 12,
          padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              backgroundColor: `${platform.color}15`,
              color: platform.color,
            }}
          >
            {platform.icon}
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
            {mode === 'connect' ? 'Connect' : 'Reconnect'} {platform.label}
          </h2>
        </div>

        {/* Permissions: Will do */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            What ContentOS will do:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li style={{ fontSize: 13, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>&#10003;</span>
              Post content on your behalf when you publish
            </li>
            <li style={{ fontSize: 13, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>&#10003;</span>
              Read your profile for your name and avatar
            </li>
          </ul>
        </div>

        {/* Permissions: Will NOT do */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            What ContentOS will NOT do:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--error)', fontWeight: 600 }}>&#10007;</span>
              Send messages or interact with others
            </li>
            <li style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--error)', fontWeight: 600 }}>&#10007;</span>
              Access followers or private data
            </li>
          </ul>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAuthorize}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              background: '#CBFF53',
              color: '#000',
              cursor: 'pointer',
            }}
          >
            Authorize {platform.label}
          </button>
        </div>
      </div>
    </div>
  )
}
