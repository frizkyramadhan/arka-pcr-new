/**
 * DELETE /api/api-tokens/:id — revoke an API token (the row is kept for audit). Permission: system.access + api-tokens.revoke.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { revokeApiToken } from '@/lib/api-tokens'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

type RouteContext = { params: { id: string } }

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'api-tokens.revoke')
  if (forbidden) return forbidden

  const result = await revokeApiToken(params.id, Number(session.user.id) || null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(result.value)
}
