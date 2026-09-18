/**
 * GET/PATCH/DELETE /api/maintenance-plans/[id] — single maintenance plan.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  deleteMaintenancePlan,
  getMaintenancePlanById,
  updateMaintenancePlan
} from '@/lib/fms/maintenance-plans'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-plan.read')
  if (forbidden) return forbidden

  const plan = await getMaintenancePlanById(params.id)
  if (!plan) {
    return NextResponse.json({ error: 'Maintenance plan not found' }, { status: 404 })
  }

  return NextResponse.json(plan)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-plan.update')
  if (forbidden) return forbidden

  const body = await request.json()

  try {
    const result = await updateMaintenancePlan(params.id, body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.item)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update maintenance plan'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-plan.delete')
  if (forbidden) return forbidden

  try {
    const result = await deleteMaintenancePlan(params.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete maintenance plan'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
