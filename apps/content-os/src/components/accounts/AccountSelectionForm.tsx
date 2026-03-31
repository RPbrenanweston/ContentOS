'use client'

import { useState } from 'react'

interface SessionEntity {
  id: string
  name: string
  type: 'personal' | 'page'
  externalId: string
  pictureUrl?: string | null
}

interface Props {
  sessionId: string
  entities: SessionEntity[]
}

export function AccountSelectionForm({ sessionId, entities }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(entities.map((e) => e.id)),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(entityId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(entityId)) {
        next.delete(entityId)
      } else {
        next.add(entityId)
      }
      return next
    })
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/accounts/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          selectedEntityIds: Array.from(selected),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }

      window.location.href = '/accounts?connected=linkedin'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const hasSelection = selected.size > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {entities.map((entity) => {
        const isPersonal = entity.type === 'personal'
        const checked = selected.has(entity.id)

        return (
          <label
            key={entity.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: 'var(--card)',
              border: checked
                ? '1.5px solid var(--accent, #CBFF53)'
                : '1.5px solid var(--card-border)',
              cursor: isPersonal ? 'default' : 'pointer',
              opacity: isPersonal ? 1 : undefined,
              transition: 'border-color 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={isPersonal}
              onChange={() => toggle(entity.id)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--accent, #CBFF53)',
                cursor: isPersonal ? 'default' : 'pointer',
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--foreground)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {entity.name}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: 'var(--muted)',
                }}
              >
                {isPersonal ? 'Personal profile' : 'Company page'}
              </p>
            </div>
          </label>
        )
      })}

      {error && (
        <p
          style={{
            margin: 0,
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--error, #ef4444)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !hasSelection}
        style={{
          marginTop: '8px',
          padding: '10px 0',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: 600,
          cursor: submitting || !hasSelection ? 'not-allowed' : 'pointer',
          backgroundColor:
            submitting || !hasSelection
              ? 'var(--muted, #888)'
              : '#CBFF53',
          color: '#000000',
          opacity: submitting || !hasSelection ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {submitting ? 'Connecting...' : `Connect selected (${selected.size})`}
      </button>
    </div>
  )
}
