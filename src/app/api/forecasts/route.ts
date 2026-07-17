import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createForecast, listForecastsPaginated } from '@/lib/forecasts/service'
import { forecastCreateSchema } from '@/lib/validations/forecast'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'
import { parseListSearch } from '@/lib/utils/list-search'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl

  const pagination = parseListPagination(searchParams)

  const planPeriod = searchParams.get('planPeriod')?.trim()
  const planMonth = searchParams.get('planMonth')?.trim()

  let resolvedPlanPeriod: string | null = null
  if (planMonth && /^\d{4}-\d{2}$/.test(planMonth)) {
    resolvedPlanPeriod = `${planMonth}-01`
  } else if (planPeriod) {
    resolvedPlanPeriod = /^\d{4}-\d{2}$/.test(planPeriod) ? `${planPeriod}-01` : planPeriod
  }

  const result = await listForecastsPaginated(session, {
    projectCode: searchParams.get('projectCode'),
    quarter: searchParams.get('quarter'),
    planPeriod: resolvedPlanPeriod,
    status: searchParams.get('status'),
    baPcrStatus: searchParams.get('baPcrStatus'),
    fleetUnitId:
      searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
        ? Number(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))
        : null,
    idMod: searchParams.get('idMod') ? Number(searchParams.get('idMod')) : null,
    search: parseListSearch(searchParams)
  }, pagination)

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
