/**
 * GET /api/dashboard/maintenance-control?year=&month=&mode=MTD|YTD&projectId=&programId=
 * All numbers for the Fundamental Maintenance Control dashboard, scoped to the session's projects.
 * Permission: maintenance-dashboard.read.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getMaintenanceControl } from '@/lib/fms/dashboard/control'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-dashboard.read')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const now = new Date()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  const mode = searchParams.get('mode') === 'MTD' ? 'MTD' : 'YTD'

  try {
    const data = await getMaintenanceControl(session, {
      year,
      month,
      mode,
      projectId: searchParams.get('projectId'),
      programId: searchParams.get('programId')
    })

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load maintenance control'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
