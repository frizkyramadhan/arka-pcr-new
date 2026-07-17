import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteForecast, getForecastById, updateForecast } from '@/lib/forecasts/service'
import { forecastUpdateSchema } from '@/lib/validations/forecast'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idForecast = Number(params.id)
  if (Number.isNaN(idForecast)) {
    return NextResponse.json({ error: 'Invalid forecast id' }, { status: 400 })
  }

  const row = await getForecastById(session, idForecast)
  if (!row) {
    return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.update')
  if (forbidden) return forbidden

  const idForecast = Number(params.id)
  const body = await request.json()
  const parsed = forecastUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateForecast(session, idForecast, parsed.data)
    if (!row) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.delete')
  if (forbidden) return forbidden

  const idForecast = Number(params.id)

  try {
    const result = await deleteForecast(session, idForecast)
    if (!result) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
