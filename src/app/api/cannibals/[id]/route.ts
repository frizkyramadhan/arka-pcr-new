import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  deleteCannibalRecord,
  getCannibalById,
  updateCannibalRecord
} from '@/lib/cannibal/service'
import { cannibalUpdateSchema } from '@/lib/validations/cannibal'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.access')
  if (forbidden) return forbidden

  const idBa = Number(params.id)
  const row = await getCannibalById(session, idBa)

  if (!row) {
    return NextResponse.json({ error: 'BA not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.update')
  if (forbidden) return forbidden

  const idBa = Number(params.id)
  const body = await request.json()
  const parsed = cannibalUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateCannibalRecord(session, idBa, parsed.data)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.update')
  if (forbidden) return forbidden

  const idBa = Number(params.id)

  try {
    const result = await deleteCannibalRecord(session, idBa)
    if (!result) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
