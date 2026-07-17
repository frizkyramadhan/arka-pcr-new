import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { ensureEquipmentAndRecompute, listConditionRecordsPaginated } from '@/lib/condition/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'
import { parseListSearch } from '@/lib/utils/list-search'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const pagination = parseListPagination(searchParams)
  const fleetUnitId = searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
  const idMod = searchParams.get('idMod') ?? searchParams.get('modelComponentId')

  const result = await listConditionRecordsPaginated(session, {
    fleetUnitId: fleetUnitId ? Number(fleetUnitId) : null,
    idMod: idMod ? Number(idMod) : null,
    condition: searchParams.get('condition'),
    projectCode: searchParams.get('projectCode'),
    sosRating: searchParams.get('sosRating'),
    evaluatedAtFrom: searchParams.get('evaluatedAtFrom'),
    evaluatedAtTo: searchParams.get('evaluatedAtTo'),
    search: parseListSearch(searchParams)
  }, pagination)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'conditions.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const fleetUnitId = Number(body?.fleetUnitId ?? body?.fleetEquipmentId)

  if (!fleetUnitId || Number.isNaN(fleetUnitId)) {
    return NextResponse.json({ error: 'fleetUnitId is required' }, { status: 400 })
  }

  try {
    const rows = await ensureEquipmentAndRecompute(session, fleetUnitId)

    return NextResponse.json({ recomputed: rows.length, rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recompute failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
