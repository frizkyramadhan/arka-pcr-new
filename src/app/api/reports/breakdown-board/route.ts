/** GET /api/reports/breakdown-board — unit population for a project, with open BD detail. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listBreakdownBoard } from '@/lib/dmbd/report-board'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListSearch } from '@/lib/utils/list-search'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, ['reports.access', 'breakdown.read'])
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const projectCode = searchParams.get('projectCode') || searchParams.get('projectId') || ''
  if (!projectCode.trim()) {
    return NextResponse.json({ data: [], rows: [], total: 0 })
  }

  const data = await listBreakdownBoard(session, {
    projectCode,
    fleetUnitId: searchParams.get('fleetUnitId') || searchParams.get('unitId') || undefined,
    status: searchParams.get('status') || undefined,
    q: parseListSearch(searchParams) || undefined,
    plantGroup: searchParams.get('plantGroup') || undefined,
    plantType: searchParams.get('plantType') || undefined
  })

  return NextResponse.json({ data, rows: data, total: data.length })
}
