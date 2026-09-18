/**
 * GET/PATCH/DELETE /api/maintenance-types/[id] — single maintenance type.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  deleteMaintenanceType,
  getMaintenanceTypeById,
  updateMaintenanceType
} from '@/lib/fms/maintenance-types'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-type.read')
  if (forbidden) return forbidden

  const item = await getMaintenanceTypeById(params.id)
  if (!item) {
    return NextResponse.json({ error: 'Maintenance type not found' }, { status: 404 })
  }

  return NextResponse.json(item)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-type.update')
  if (forbidden) return forbidden

  const body = await request.json()

  try {
    const result = await updateMaintenanceType(params.id, body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.item)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update maintenance type'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-type.delete')
  if (forbidden) return forbidden

  try {
    const result = await deleteMaintenanceType(params.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete maintenance type'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
