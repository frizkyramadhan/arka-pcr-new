import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  deleteReplacement,
  getReplacementById,
  updateReplacement
} from '@/lib/replacement/service'
import { replacementUpdateSchema } from '@/lib/validations/replacement'
import { requireAnyPermissionOrForbidden, requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idRep = Number(params.id)
  const row = await getReplacementById(session, idRep)

  if (!row) {
    return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idRep = Number(params.id)
  const existing = await getReplacementById(session, idRep)

  if (!existing) {
    return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })
  }

  if (existing.woStatus === 'CLOSE') {
    const forbidden = requireAnyPermissionOrForbidden(session, ['system.admin', 'replacements.edit.close'])
    if (forbidden) return forbidden
  } else {
    const forbidden = requirePermissionOrForbidden(session, 'replacements.update')
    if (forbidden) return forbidden
  }

  const body = await request.json()
  const parsed = replacementUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateReplacement(session, idRep, parsed.data)
    if (!row) return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idRep = Number(params.id)

  const forbidden = requirePermissionOrForbidden(session, 'replacements.delete')
  if (forbidden) return forbidden

  try {
    const result = await deleteReplacement(session, idRep)
    if (!result) return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
