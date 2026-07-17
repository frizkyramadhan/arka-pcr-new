import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { convertForecastToReplacement } from '@/lib/forecasts/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

/** Convert is authorized in service (Planner Foreman or BA submitter). */

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.access')
  if (forbidden) return forbidden

  const idForecast = Number(params.id)

  try {
    const row = await convertForecastToReplacement(session, idForecast)
    if (!row) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Convert failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
