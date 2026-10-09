/**
 * GET /api/maintenance-failures/sheet — baris Excel temuan untuk filter list failure.
 * Kolomnya sama dengan sheet actual supaya file bisa diimpor ulang.
 * Butuh exports.maintenance_actuals.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { actualSheetRowsForFailures } from '@/lib/fms/maintenance-actual-exchange'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'exports.maintenance_actuals')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl

  try {
    const rows = await actualSheetRowsForFailures(session, {
      projectId: searchParams.get('projectId') || undefined,
      fleetUnitId: searchParams.get('fleetUnitId') || searchParams.get('unitId') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined
    })

    return NextResponse.json({ rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build failure sheet'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
