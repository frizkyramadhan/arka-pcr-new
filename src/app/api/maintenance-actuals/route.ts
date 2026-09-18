/**
 * GET /api/maintenance-actuals — list with plan/unit/date filters. POST — create actual.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createMaintenanceActual, listMaintenanceActuals } from '@/lib/fms/maintenance-actuals'
import {
  requireAnyPermissionOrForbidden,
  requirePermissionOrForbidden,
  requireSession
} from '@/lib/utils/api-auth'

function queryRecord(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'maintenance-actual.read',
    'reports.access'
  ])
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const params = queryRecord(searchParams)

  try {
    const result = await listMaintenanceActuals({
      projectId: params.projectId || params.projectCode,
      projectCode: params.projectCode,
      maintenanceTypeId: params.maintenanceTypeId,
      unitId: params.unitId,
      fleetUnitId: params.fleetUnitId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      search: params.search || params.q
    })

    return NextResponse.json({ ...result, params })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list maintenance actuals'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const sessionUserId = Number(session.user.id)

  try {
    const result = await createMaintenanceActual(body, sessionUserId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ maintenanceActual: result.maintenanceActual }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create maintenance actual'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
