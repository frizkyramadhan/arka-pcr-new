/**
 * POST /api/maintenance-plans/schedule — simpan centang grid unit × tanggal.
 * Tanggal baru butuh maintenance-plan.create.
 * Mengubah atau menghapus tanggal yang sudah ada butuh maintenance-plan.update.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { parseCreatedById, syncMaintenanceSchedule } from '@/lib/fms/maintenance-plans'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const allowCreate = !requirePermissionOrForbidden(session, 'maintenance-plan.create')
  const allowModifyExisting = !requirePermissionOrForbidden(session, 'maintenance-plan.update')
  if (!allowCreate && !allowModifyExisting) {
    return requirePermissionOrForbidden(session, 'maintenance-plan.create')
  }

  const sessionUserId = Number(session.user.id)

  try {
    const body = await request.json()
    const createdById = parseCreatedById(body?.createdById, sessionUserId)
    if (!createdById) {
      return NextResponse.json({ error: 'createdById is required' }, { status: 400 })
    }

    const result = await syncMaintenanceSchedule(body, createdById, { allowCreate, allowModifyExisting })
    if (!result.ok) {
      return NextResponse.json({ error: result.error, locked: result.locked }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save schedule'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
