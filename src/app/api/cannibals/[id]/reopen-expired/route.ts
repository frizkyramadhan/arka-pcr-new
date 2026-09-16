/**
 * POST /api/cannibals/:id/reopen-expired — restore last workflow stage and restart SLA.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { reopenExpiredCannibalBa } from '@/lib/cannibal/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.reopen')
  if (forbidden) return forbidden

  const idBa = Number(params.id)

  try {
    const row = await reopenExpiredCannibalBa(session, idBa)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reopen failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
