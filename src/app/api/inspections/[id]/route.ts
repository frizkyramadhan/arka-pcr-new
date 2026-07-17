import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  deleteInspectionRecord,
  getInspectionById,
  updateInspectionRecord
} from '@/lib/inspection/service'
import { inspectionUpdateSchema } from '@/lib/validations/inspection'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idIns = Number(params.id)
  const row = await getInspectionById(session, idIns)

  if (!row) {
    return NextResponse.json({ error: 'Inspection record not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'inspections.update')
  if (forbidden) return forbidden

  const idIns = Number(params.id)
  const body = await request.json()
  const parsed = inspectionUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateInspectionRecord(session, idIns, parsed.data)
    if (!row) return NextResponse.json({ error: 'Inspection record not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'inspections.delete')
  if (forbidden) return forbidden

  const idIns = Number(params.id)
  const result = await deleteInspectionRecord(session, idIns)

  if (!result) {
    return NextResponse.json({ error: 'Inspection record not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
