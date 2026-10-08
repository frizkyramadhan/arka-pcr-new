/**
 * POST /api/maintenance-plans/schedule — simpan centang grid unit × tanggal.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { parseCreatedById, syncMaintenanceSchedule } from '@/lib/fms/maintenance-plans'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbiddenCreate = requirePermissionOrForbidden(session, 'maintenance-plan.create')
  if (forbiddenCreate) return forbiddenCreate

  const forbiddenUpdate = requirePermissionOrForbidden(session, 'maintenance-plan.update')
  if (forbiddenUpdate) return forbiddenUpdate

  const allowDelete = !requirePermissionOrForbidden(session, 'maintenance-plan.delete')
  const sessionUserId = Number(session.user.id)

  try {
    const body = await request.json()
    const createdById = parseCreatedById(body?.createdById, sessionUserId)
    if (!createdById) {
      return NextResponse.json({ error: 'createdById is required' }, { status: 400 })
    }

    const result = await syncMaintenanceSchedule(body, createdById, { allowDelete })
    if (!result.ok) {
      return NextResponse.json({ error: result.error, locked: result.locked }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save schedule'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
