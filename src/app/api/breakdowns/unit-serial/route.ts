/**
 * GET /api/breakdowns/unit-serial — serial of one unit from ARKFleet.
 * Reads equipments.serial_no live. The local unit cache does not store it.
 * The work order copies the value onto U_MIS_SerialNo. It is not typed by hand.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getEquipmentById } from '@/lib/fleet-api/client'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const fleetUnitId = Number(request.nextUrl.searchParams.get('fleetUnitId'))
  if (!Number.isInteger(fleetUnitId) || fleetUnitId <= 0) {
    return NextResponse.json({ error: 'Unit is required' }, { status: 400 })
  }

  try {
    const unit = await getEquipmentById(fleetUnitId)
    if (!unit) return NextResponse.json({ serialNo: null })
    if (!canAccessProject(session, unit.project_code)) {
      return NextResponse.json({ error: 'You cannot use this unit' }, { status: 403 })
    }

    return NextResponse.json({ serialNo: unit.serial_no?.trim() || null })
  } catch {
    return NextResponse.json({ serialNo: null })
  }
}
