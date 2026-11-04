/**
 * GET /api/breakdowns/open-bd — open BD-position episode for a unit (if any).
 * Used by the add form to warn and default the first activity to AJ.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isOpenBdPositionEpisode, latestActivity } from '@/lib/dmbd/breakdowns'
import { prisma } from '@/lib/prisma'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'
import { toWallClockIso } from '@/lib/utils/wall-clock'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const fleetUnitId = Number(request.nextUrl.searchParams.get('fleetUnitId'))
  if (!Number.isInteger(fleetUnitId) || fleetUnitId <= 0) {
    return NextResponse.json({ error: 'Unit is required' }, { status: 400 })
  }

  const unit = await prisma.fleetUnitCache.findUnique({
    where: { fleetUnitId },
    select: { fleetUnitId: true, unitNo: true, projectCode: true }
  })
  if (!unit) return NextResponse.json({ error: 'Unit was not found' }, { status: 400 })
  if (!canAccessProject(session, unit.projectCode)) {
    return NextResponse.json({ error: 'You cannot view this unit' }, { status: 403 })
  }

  const openRows = await prisma.breakdown.findMany({
    where: { fleetUnitId, finishedAt: null },
    select: {
      id: true,
      workOrder: true,
      problem: true,
      startedAt: true,
      activities: { select: { startedAt: true, createdAt: true, positionStatus: true } }
    },
    orderBy: { startedAt: 'desc' }
  })

  const openBd = openRows.find(row => isOpenBdPositionEpisode(row.activities))
  if (!openBd) return NextResponse.json({ openBd: null })

  const latest = latestActivity(openBd.activities)

  return NextResponse.json({
    openBd: {
      id: openBd.id,
      unitNo: unit.unitNo,
      workOrder: openBd.workOrder,
      problem: openBd.problem,
      startedAt: toWallClockIso(openBd.startedAt),
      positionStatus: latest?.positionStatus ?? 'BD'
    }
  })
}
