import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { closeForecast } from '@/lib/forecasts/service'
import { forecastCloseSchema } from '@/lib/validations/forecast'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.update')
  if (forbidden) return forbidden

  const idForecast = Number(params.id)
  const body = await request.json()
  const parsed = forecastCloseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await closeForecast(session, idForecast, parsed.data)
    if (!row) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Close failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
