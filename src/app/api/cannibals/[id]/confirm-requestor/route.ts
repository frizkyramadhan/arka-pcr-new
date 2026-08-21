import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { confirmCannibalRequestor } from '@/lib/cannibal/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.access')
  if (forbidden) return forbidden

  const { id } = await context.params
  const idBa = Number(id)

  if (!Number.isFinite(idBa)) {
    return NextResponse.json({ error: 'Invalid BA id' }, { status: 400 })
  }

  try {
    const row = await confirmCannibalRequestor(session, idBa)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Confirm requestor failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
