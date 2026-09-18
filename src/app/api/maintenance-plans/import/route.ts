/**
 * POST /api/maintenance-plans/import — bulk upsert plans from Excel import UI.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { importMaintenancePlans, parseCreatedById } from '@/lib/fms/maintenance-plans'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbiddenCreate = requirePermissionOrForbidden(session, 'maintenance-plan.create')
  if (forbiddenCreate) return forbiddenCreate

  const forbiddenUpdate = requirePermissionOrForbidden(session, 'maintenance-plan.update')
  if (forbiddenUpdate) return forbiddenUpdate

  const sessionUserId = Number(session.user.id)

  try {
    const body = await request.json()
    const plans = body?.plans
    if (!Array.isArray(plans)) {
      return NextResponse.json({ error: 'plans must be an array' }, { status: 400 })
    }

    const createdById = parseCreatedById(body?.createdById, sessionUserId)
    if (!createdById) {
      return NextResponse.json({ error: 'createdById is required' }, { status: 400 })
    }

    const result = await importMaintenancePlans(plans, createdById)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
