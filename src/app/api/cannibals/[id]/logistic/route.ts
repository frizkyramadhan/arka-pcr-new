import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { updateCannibalLogisticStatement } from '@/lib/cannibal/service'
import { cannibalLogisticUpdateSchema } from '@/lib/validations/cannibal'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { LOGISTIC_STATEMENT_PERMISSION_CODES } from '@/lib/cannibal/logistic-access'

type RouteContext = {
  params: { id: string }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [...LOGISTIC_STATEMENT_PERMISSION_CODES])
  if (forbidden) return forbidden

  const idBa = Number(params.id)
  const body = await request.json()
  const parsed = cannibalLogisticUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateCannibalLogisticStatement(session, idBa, parsed.data)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update logistic statement failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
