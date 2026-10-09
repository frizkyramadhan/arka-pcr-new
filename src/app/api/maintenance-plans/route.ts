/**
 * GET /api/maintenance-plans — list with filters (maintenance-plan.read).
 * Query export=1 is the list Excel download and also needs exports.maintenance_plans.
 * POST — create plan.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createMaintenancePlan, listMaintenancePlans } from '@/lib/fms/maintenance-plans'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { gridSortFromSearchParams, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'

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

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-plan.read')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const params = queryRecord(searchParams)
  const page = params.export === '1' ? undefined : parseOptionalPageFromSearchParams(searchParams)
  const sort = gridSortFromSearchParams(searchParams)

  if (params.export === '1') {
    const forbiddenExport = requirePermissionOrForbidden(session, 'exports.maintenance_plans')
    if (forbiddenExport) return forbiddenExport
  }

  try {
    const result = await listMaintenancePlans(session, {
      projectId: params.projectId,
      year: params.year,
      month: params.month,
      maintenanceTypeId: params.maintenanceTypeId,
      withDetails: params.details === '1',
      search: params.search || params.q,
      page: page?.page,
      pageSize: page?.pageSize,
      sortField: sort.sortField,
      sortOrder: sort.sortOrder
    })

    return NextResponse.json({ ...result, params })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list maintenance plans'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-plan.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const sessionUserId = Number(session.user.id)

  try {
    const result = await createMaintenancePlan(body, sessionUserId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ maintenancePlan: result.maintenancePlan }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create maintenance plan'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
