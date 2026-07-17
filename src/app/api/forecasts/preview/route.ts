import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getForecastComponentPreview } from '@/lib/forecasts/preview'
import { hasAnyPermission, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (
    !hasAnyPermission(session, ['forecasts.create', 'forecasts.update', 'forecasts.access'])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const fleetUnitId = Number(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))
  const idMod = Number(searchParams.get('idMod') ?? searchParams.get('modelComponentId'))

  if (Number.isNaN(fleetUnitId) || Number.isNaN(idMod)) {
    return NextResponse.json({ error: 'fleetUnitId and idMod are required' }, { status: 400 })
  }

  try {
    const preview = await getForecastComponentPreview(session, fleetUnitId, idMod)
    if (!preview) {
      return NextResponse.json({ error: 'Component preview not found' }, { status: 404 })
    }

    return NextResponse.json(preview)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
