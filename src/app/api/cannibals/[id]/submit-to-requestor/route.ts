import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { submitCannibalToRequestor } from '@/lib/cannibal/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.update')
  if (forbidden) return forbidden

  const { id } = await context.params
  const idBa = Number(id)

  try {
    const row = await submitCannibalToRequestor(session, idBa)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Submit to requestor failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
