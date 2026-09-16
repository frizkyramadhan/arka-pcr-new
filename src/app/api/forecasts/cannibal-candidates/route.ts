/**
 * Cannibal BA candidates that REMOVE the forecast unit and INSTALL the other unit.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listCannibalLinkCandidates } from '@/lib/forecasts/return-other'
import { hasAnyPermission, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (!hasAnyPermission(session, ['forecasts.create', 'forecasts.update', 'forecasts.access'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const removeFleetUnitId = Number(searchParams.get('removeFleetUnitId'))
  const installFleetUnitId = Number(searchParams.get('installFleetUnitId'))
  const compDesc = searchParams.get('compDesc')
  const search = searchParams.get('search')
  const limit = searchParams.get('limit')

  if (
    !Number.isInteger(removeFleetUnitId) ||
    removeFleetUnitId <= 0 ||
    !Number.isInteger(installFleetUnitId) ||
    installFleetUnitId <= 0
  ) {
    return NextResponse.json({ error: 'removeFleetUnitId and installFleetUnitId are required' }, { status: 400 })
  }

  const rows = await listCannibalLinkCandidates(
    session,
    { removeFleetUnitId, installFleetUnitId, compDesc },
    { search, limit: limit ? Number(limit) : undefined }
  )

  return NextResponse.json(rows)
}
