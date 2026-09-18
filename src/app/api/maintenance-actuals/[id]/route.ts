/**
 * GET/PATCH/DELETE /api/maintenance-actuals/[id] — single maintenance actual (detail on GET).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  deleteMaintenanceActual,
  getMaintenanceActualById,
  updateMaintenanceActual
} from '@/lib/fms/maintenance-actuals'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.read')
  if (forbidden) return forbidden

  const actual = await getMaintenanceActualById(params.id)
  if (!actual) {
    return NextResponse.json({ error: 'Maintenance actual not found' }, { status: 404 })
  }

  return NextResponse.json(actual)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.update')
  if (forbidden) return forbidden

  const body = await request.json()

  try {
    const result = await updateMaintenanceActual(params.id, body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.item)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update maintenance actual'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.delete')
  if (forbidden) return forbidden

  try {
    const result = await deleteMaintenanceActual(params.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete maintenance actual'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
