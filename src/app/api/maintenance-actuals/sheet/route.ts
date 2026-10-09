/**
 * GET /api/maintenance-actuals/sheet — baris Excel actual + temuan untuk filter list actual.
 * Butuh exports.maintenance_actuals.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { actualSheetRowsForActuals } from '@/lib/fms/maintenance-actual-exchange'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'exports.maintenance_actuals')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl

  try {
    const rows = await actualSheetRowsForActuals(session, {
      projectId: searchParams.get('projectId') || searchParams.get('projectCode') || undefined,
      projectCode: searchParams.get('projectCode') || undefined,
      maintenanceTypeId: searchParams.get('maintenanceTypeId') || undefined,
      unitId: searchParams.get('unitId') || undefined,
      fleetUnitId: searchParams.get('fleetUnitId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || searchParams.get('q') || undefined
    })

    return NextResponse.json({ rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build actual sheet'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
