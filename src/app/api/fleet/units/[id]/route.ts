import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getUnitForSession } from '@/lib/fleet-api/equipment-service'
import { getLatestHourMeterForUnit } from '@/lib/hour-meter/service'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const fleetId = Number(params.id)
  if (Number.isNaN(fleetId)) {
    return NextResponse.json({ error: 'Invalid unit id' }, { status: 400 })
  }

  const [unit, latestHm] = await Promise.all([
    getUnitForSession(session, fleetId),
    getLatestHourMeterForUnit(fleetId)
  ])

  if (!unit) {
    return NextResponse.json({ error: 'Unit not found in cache' }, { status: 404 })
  }

  return NextResponse.json({
    ...unit,
    latest_hm_unit: latestHm ? Number(latestHm.hmUnit) : null,
    latest_hm_date: latestHm ? toIsoDateOnly(latestHm.dateHm) : null
  })
}
