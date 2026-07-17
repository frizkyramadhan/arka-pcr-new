import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getUnitPcrSummary } from '@/lib/equipment/pcr-summary'
import { getUnitForSession } from '@/lib/fleet-api/equipment-service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const fleetId = Number(params.id)
  if (Number.isNaN(fleetId)) {
    return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 })
  }

  const unit = await getUnitForSession(session, fleetId)
  if (!unit) {
    return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
  }

  const summary = await getUnitPcrSummary(fleetId, unit.model_id)

  return NextResponse.json(summary)
}
