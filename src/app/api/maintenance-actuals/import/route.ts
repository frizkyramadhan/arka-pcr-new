/**
 * POST /api/maintenance-actuals/import — tambah actual dan temuan dari Excel.
 * Butuh imports.maintenance_actuals. Baris yang sudah ada tidak diubah dan tidak dihapus.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { importActualSheet } from '@/lib/fms/maintenance-actual-exchange'
import { parseCreatedById } from '@/lib/fms/maintenance-plans'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'imports.maintenance_actuals')
  if (forbidden) return forbidden

  const sessionUserId = Number(session.user.id)

  try {
    const body = await request.json()
    const rows = body?.rows
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: 'rows must be an array' }, { status: 400 })
    }

    const createdById = parseCreatedById(body?.createdById, sessionUserId)
    if (!createdById) {
      return NextResponse.json({ error: 'createdById is required' }, { status: 400 })
    }

    const result = await importActualSheet(session, rows, createdById)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
