import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getReplacementComponentDetail } from '@/lib/replacement/component-detail'
import { requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const fleetUnitId = Number(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))
  const idMod = Number(searchParams.get('idMod') ?? searchParams.get('modelComponentId'))

  if (Number.isNaN(fleetUnitId) || Number.isNaN(idMod)) {
    return NextResponse.json({ error: 'fleetUnitId and idMod are required' }, { status: 400 })
  }

  const pagination = parseListPagination(searchParams)
  const result = await getReplacementComponentDetail(session, fleetUnitId, idMod, pagination)

  if (!result) {
    return NextResponse.json({ error: 'Replacement detail not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
