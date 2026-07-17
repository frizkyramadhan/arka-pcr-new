import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { updateCannibalPlanning } from '@/lib/cannibal/service'
import { cannibalPlanningUpdateSchema } from '@/lib/validations/cannibal'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.update')
  if (forbidden) return forbidden

  const { id } = await context.params
  const idBa = Number(id)
  if (!Number.isFinite(idBa)) {
    return NextResponse.json({ error: 'Invalid BA id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = cannibalPlanningUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateCannibalPlanning(session, idBa, parsed.data)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update planning'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
