/**
 * GET /api/exports/maintenance-control?year=&month=&mode=MTD|YTD&projectId=&programId=&tz=
 * (`tz` = browser time zone for the "data last updated" / "generated" times.)
 * Excel workbook of the Fundamental Maintenance Control dashboard: KPI summary, monthly trend, and every detail list,
 * for the same filter and site scope as the dashboard (permission maintenance-dashboard.export).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { buildControlWorkbook } from '@/lib/fms/dashboard/control-export'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-dashboard.export')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const now = new Date()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  try {
    const { buffer, filename } = await buildControlWorkbook(
      session,
      {
        year,
        month,
        mode: searchParams.get('mode') === 'MTD' ? 'MTD' : 'YTD',
        projectId: searchParams.get('projectId'),
        programId: searchParams.get('programId')
      },
      searchParams.get('tz') || 'UTC'
    )

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export dashboard'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
