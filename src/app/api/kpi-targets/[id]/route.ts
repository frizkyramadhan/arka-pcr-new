/**
 * PUT    /api/kpi-targets/:id — replace a target's values (409 on scope conflict).
 * DELETE /api/kpi-targets/:id — remove a target.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteKpiTarget, updateKpiTarget } from '@/lib/fms/kpi-targets'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

type RouteContext = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'kpi-target.update')
  if (forbidden) return forbidden

  const body = await request.json().catch(() => ({}))
  const result = await updateKpiTarget(params.id, body, Number(session.user.id) || null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(result.value)
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'kpi-target.delete')
  if (forbidden) return forbidden

  const result = await deleteKpiTarget(params.id, Number(session.user.id) || null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(result.value)
}
