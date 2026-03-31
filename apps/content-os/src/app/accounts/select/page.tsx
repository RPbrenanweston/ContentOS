import { redirect } from 'next/navigation'
import { createServiceClient } from '@/infrastructure/supabase/client'
import { AccountSelectionForm } from '@/components/accounts/AccountSelectionForm'

interface SessionEntity {
  id: string
  name: string
  type: 'personal' | 'page'
  externalId: string
  pictureUrl?: string | null
}

export default async function AccountSelectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const sessionId = typeof params.session === 'string' ? params.session : null

  if (!sessionId) {
    redirect('/accounts')
  }

  const supabase = createServiceClient()

  const { data: session, error } = await supabase
    .from('connection_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    redirect('/accounts?error=session_expired')
  }

  if (new Date(session.expires_at) < new Date()) {
    redirect('/accounts?error=session_expired')
  }

  const pendingEntities: SessionEntity[] = session.pending_entities as SessionEntity[]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: 'var(--background)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '32px',
          borderRadius: '16px',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--foreground)',
          }}
        >
          Choose accounts to connect
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: 'var(--muted)',
          }}
        >
          Select which LinkedIn accounts you want to publish to.
        </p>

        <AccountSelectionForm
          sessionId={sessionId}
          entities={pendingEntities}
        />
      </div>
    </div>
  )
}
