/**
 * PATCH /api/maintenance-plans/details/[id]/reason — body { reason } sets why a plan row is still pending
 * (empty clears it). Used by the Backlog drill-down on the Maintenance Control dashboard.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { updatePlanDetailReason } from '@/lib/fms/maintenance-plans'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-plan.update')
  if (forbidden) return forbidden

  const body = await request.json().catch(() => ({}))

  try {
    const result = await updatePlanDetailReason(session, params.id, body?.reason, Number(session.user.id) || null)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json(result.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update reason'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
