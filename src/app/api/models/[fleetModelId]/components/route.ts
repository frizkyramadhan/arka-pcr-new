/**
 * GET /api/models/[fleetModelId]/components — commod rows for one fleet model.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listModelComponents } from '@/lib/models/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { fleetModelId: string }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await requireSession(_request)
  if (session instanceof NextResponse) return session

  const fleetModelId = Number(context.params.fleetModelId)
  if (!Number.isFinite(fleetModelId) || fleetModelId <= 0) {
    return NextResponse.json({ error: 'Invalid fleetModelId' }, { status: 400 })
  }

  const rows = await listModelComponents(fleetModelId)

  return NextResponse.json({ total: rows.length, data: rows })
}
