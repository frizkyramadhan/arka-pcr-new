import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { backfillCannibalPlantSection } from '@/lib/cannibal/service'
import { cannibalUpdateSchema } from '@/lib/validations/cannibal'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

/** Backfill plant statement on legacy cannibal BA (migrated records without statement data). */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.update')
  if (forbidden) return forbidden

  const idBa = Number(params.id)
  const body = await request.json()
  const parsed = cannibalUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await backfillCannibalPlantSection(session, idBa, parsed.data)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update plant statement failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
