import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/infrastructure/supabase/client'
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo'
import { decryptToken } from '@/lib/token-encryption'

interface SessionEntity {
  id: string
  name: string
  type: 'personal' | 'page'
  externalId: string
  pictureUrl?: string | null
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const userClient = await createClient()
    const {
      data: { user },
    } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse & validate body
    const body = await request.json()
    const { sessionId, selectedEntityIds } = body as {
      sessionId: unknown
      selectedEntityIds: unknown
    }

    if (
      typeof sessionId !== 'string' ||
      !Array.isArray(selectedEntityIds) ||
      selectedEntityIds.length === 0 ||
      !selectedEntityIds.every((id: unknown) => typeof id === 'string')
    ) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    // 3. Fetch session (service client to bypass RLS)
    const serviceClient = createServiceClient()
    const { data: session, error: sessionError } = await serviceClient
      .from('connection_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      )
    }

    // 4. Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 404 },
      )
    }

    // 5. Decrypt tokens
    const tokens = session.tokens as Record<string, string>
    const accessToken = decryptToken(tokens.access_token)
    const refreshToken = tokens.refresh_token
      ? decryptToken(tokens.refresh_token)
      : ''

    // 6. Create accounts for selected entities
    const pendingEntities = session.pending_entities as SessionEntity[]
    const selectedSet = new Set(selectedEntityIds as string[])
    const entitiesToCreate = pendingEntities.filter((e) =>
      selectedSet.has(e.id),
    )

    const accountRepo = new DistributionAccountRepo(serviceClient)

    for (const entity of entitiesToCreate) {
      await accountRepo.create({
        userId: user.id,
        platform: 'linkedin',
        accountName: entity.name,
        externalAccountId: entity.externalId,
        metadata: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: tokens.expires_in,
          token_type: tokens.token_type,
          scope: tokens.scope,
          entity_type: entity.type,
        },
      })
    }

    // 7. Delete session
    await serviceClient
      .from('connection_sessions')
      .delete()
      .eq('id', sessionId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/accounts/select] Failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
