/**
 * GET /api/breakdowns/hour-meter — hour meter reading for a unit on a date.
 * Uses the same nearest-on-or-before rule as replacement posting.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getHourMeterNearestToDate } from '@/lib/hour-meter/hm-reference'
import { prisma } from '@/lib/prisma'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const fleetUnitId = Number(request.nextUrl.searchParams.get('fleetUnitId'))
  const date = String(request.nextUrl.searchParams.get('date') ?? '').slice(0, 10)
  if (!Number.isInteger(fleetUnitId) || fleetUnitId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Unit and date are required' }, { status: 400 })
  }

  const unit = await prisma.fleetUnitCache.findUnique({
    where: { fleetUnitId },
    select: { projectCode: true }
  })
  if (!unit) return NextResponse.json({ error: 'Unit was not found' }, { status: 400 })
  if (!canAccessProject(session, unit.projectCode)) {
    return NextResponse.json({ error: 'You cannot view this unit' }, { status: 403 })
  }

  const reading = await getHourMeterNearestToDate(fleetUnitId, new Date(`${date}T00:00:00.000Z`))

  return NextResponse.json({
    hourMeter: reading ? Number(reading.hmUnit) : null,
    readingDate: reading ? reading.dateHm.toISOString().slice(0, 10) : null
  })
}
