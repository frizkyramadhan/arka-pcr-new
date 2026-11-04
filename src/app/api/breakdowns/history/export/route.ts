/** GET /api/breakdowns/history/export — dump breakdowns as site daily-report Excel. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { buildHistoryWorkbook } from '@/lib/dmbd/history-sheet'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl

  const { buffer, filename } = await buildHistoryWorkbook(session, {
    projectCode: searchParams.get('projectCode') || searchParams.get('projectId') || undefined,
    fleetUnitId: searchParams.get('fleetUnitId') || searchParams.get('unitId') || undefined,
    status: searchParams.get('status') || undefined,
    bdFrom: searchParams.get('bdFrom') || undefined,
    bdTo: searchParams.get('bdTo') || undefined
  })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
