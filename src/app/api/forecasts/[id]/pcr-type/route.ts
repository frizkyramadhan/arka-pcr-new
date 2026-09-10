import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { updateForecastPcrType } from '@/lib/forecasts/service'
import { forecastPcrTypeUpdateSchema } from '@/lib/validations/forecast'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

/** Fill PCR type on a submitted forecast that still has no category. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.update')
  if (forbidden) return forbidden

  const idForecast = Number(params.id)
  if (Number.isNaN(idForecast)) {
    return NextResponse.json({ error: 'Invalid forecast id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = forecastPcrTypeUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateForecastPcrType(session, idForecast, parsed.data)
    if (!row) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
