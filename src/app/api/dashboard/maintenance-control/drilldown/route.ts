/**
 * GET /api/dashboard/maintenance-control/drilldown?kind=&year=&month=&mode=&projectId=&programId=
 *   &bucket=&qc=&severity=&open=1&overdue=1&repeat=1
 * Detail list behind a dashboard KPI (spec section 13), same filters and scope as the dashboard.
 * Permission: maintenance-dashboard.drilldown.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { DRILLDOWN_KINDS, type DrilldownKind, getControlDrilldown } from '@/lib/fms/dashboard/control-drilldown'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-dashboard.drilldown')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const kind = searchParams.get('kind') as DrilldownKind
  if (!DRILLDOWN_KINDS.includes(kind)) return NextResponse.json({ error: 'Unknown drill-down' }, { status: 400 })

  const now = new Date()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  try {
    const data = await getControlDrilldown(
      session,
      {
        year,
        month,
        mode: searchParams.get('mode') === 'MTD' ? 'MTD' : 'YTD',
        projectId: searchParams.get('projectId'),
        programId: searchParams.get('programId')
      },
      kind,
      {
        bucket: searchParams.get('bucket'),
        qc: searchParams.get('qc'),
        severity: searchParams.get('severity'),
        open: searchParams.get('open') === '1',
        overdue: searchParams.get('overdue') === '1',
        repeat: searchParams.get('repeat') === '1'
      }
    )

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load drill-down'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
