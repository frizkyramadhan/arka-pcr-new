import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { parseForecastListQuery } from '@/lib/forecasts/list-query'
import { createForecast, listForecastsPaginated } from '@/lib/forecasts/service'
import { forecastCreateSchema } from '@/lib/validations/forecast'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl

  const pagination = parseListPagination(searchParams)
  const result = await listForecastsPaginated(session, parseForecastListQuery(searchParams), pagination)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = forecastCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await createForecast(session, parsed.data, Number(session.user.id) || undefined)

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create forecast'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
