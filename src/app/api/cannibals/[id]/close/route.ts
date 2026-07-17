import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { closeCannibalRecord } from '@/lib/cannibal/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.update')
  if (forbidden) return forbidden

  const idBa = Number(params.id)

  try {
    const row = await closeCannibalRecord(session, idBa)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Close failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
