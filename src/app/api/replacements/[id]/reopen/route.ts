import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { reopenReplacement } from '@/lib/replacement/service'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, ['system.admin', 'replacements.update'])
  if (forbidden) return forbidden

  const idRep = Number(params.id)

  try {
    const row = await reopenReplacement(session, idRep)
    if (!row) return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reopen failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
