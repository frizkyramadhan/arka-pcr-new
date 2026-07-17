import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { refreshForecastMetrics } from '@/lib/forecasts/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.create')
  if (forbidden) return forbidden

  const idForecast = Number(params.id)

  try {
    const row = await refreshForecastMetrics(session, idForecast)
    if (!row) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refresh failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
