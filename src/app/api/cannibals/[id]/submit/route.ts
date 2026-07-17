import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { submitCannibalRecord } from '@/lib/cannibal/service'
import { LOGISTIC_STATEMENT_PERMISSION_CODES } from '@/lib/cannibal/logistic-access'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [...LOGISTIC_STATEMENT_PERMISSION_CODES])
  if (forbidden) return forbidden

  const idBa = Number(params.id)

  try {
    const row = await submitCannibalRecord(session, idBa)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Submit failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
