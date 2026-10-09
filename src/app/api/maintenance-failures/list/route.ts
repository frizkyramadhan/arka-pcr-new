/**
 * GET /api/maintenance-failures/list — daftar temuan untuk menu Failure.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listFailures } from '@/lib/fms/maintenance-failures'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { gridSortFromSearchParams, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.read')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const page = parseOptionalPageFromSearchParams(searchParams)
  const sort = gridSortFromSearchParams(searchParams)

  const result = await listFailures(session, {
    projectId: searchParams.get('projectId') || undefined,
    fleetUnitId: searchParams.get('fleetUnitId') || searchParams.get('unitId') || undefined,
    status: searchParams.get('status') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    search: searchParams.get('search') || searchParams.get('q') || undefined,
    page: page?.page,
    pageSize: page?.pageSize,
    sortField: sort.sortField,
    sortOrder: sort.sortOrder
  })

  return NextResponse.json(result)
}
