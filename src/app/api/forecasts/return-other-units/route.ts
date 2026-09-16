/**
 * Other-unit picker for Return To Other Unit — all projects, same component.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listReturnOtherUnitOptions } from '@/lib/forecasts/return-other'
import { hasAnyPermission, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (!hasAnyPermission(session, ['forecasts.create', 'forecasts.update', 'forecasts.access'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const idMod = Number(searchParams.get('idMod'))
  const excludeFleetUnitId = Number(searchParams.get('excludeFleetUnitId'))
  const search = searchParams.get('search')
  const limit = searchParams.get('limit')

  if (!Number.isInteger(idMod) || idMod <= 0 || !Number.isInteger(excludeFleetUnitId) || excludeFleetUnitId <= 0) {
    return NextResponse.json({ error: 'idMod and excludeFleetUnitId are required' }, { status: 400 })
  }

  const rows = await listReturnOtherUnitOptions(idMod, excludeFleetUnitId, {
    search,
    limit: limit ? Number(limit) : undefined
  })

  return NextResponse.json(rows)
}
