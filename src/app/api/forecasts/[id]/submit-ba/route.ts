import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { submitForecastBa } from '@/lib/forecasts/service'
import { forecastSubmitBaSchema } from '@/lib/validations/forecast'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idForecast = Number(params.id)

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = forecastSubmitBaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const row = await submitForecastBa(session, idForecast, Number(session.user.id) || 0, parsed.data)
    if (!row) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Submit failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
