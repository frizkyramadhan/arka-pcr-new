import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteAllForecastsForUnit } from '@/lib/forecasts/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

/** DELETE all deletable OPEN forecasts for one unit. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.delete')
  if (forbidden) return forbidden

  const fleetUnitId = Number(params.id)
  if (Number.isNaN(fleetUnitId)) {
    return NextResponse.json({ error: 'Invalid unit id' }, { status: 400 })
  }

  try {
    const result = await deleteAllForecastsForUnit(session, fleetUnitId)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete all failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
