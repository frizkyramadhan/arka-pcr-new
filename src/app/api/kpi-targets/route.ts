/**
 * GET  /api/kpi-targets?kpiCode=&projectId= — all KPI targets plus the KPI list for the form.
 * POST /api/kpi-targets — create a target (409 when the same KPI/site/program/date exists).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createKpiTarget, KPI_DEFINITIONS, listKpiTargets } from '@/lib/fms/kpi-targets'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'kpi-target.read')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl

  const result = await listKpiTargets({
    kpiCode: searchParams.get('kpiCode'),
    projectId: searchParams.get('projectId')
  })

  return NextResponse.json({ ...result, kpis: KPI_DEFINITIONS })
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'kpi-target.create')
  if (forbidden) return forbidden

  const body = await request.json().catch(() => ({}))
  const result = await createKpiTarget(body, Number(session.user.id) || null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(result.value, { status: 201 })
}
