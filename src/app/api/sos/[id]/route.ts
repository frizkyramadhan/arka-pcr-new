import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteSosRecord, getSosById, updateSosRecord } from '@/lib/sos/service'
import { sosUpdateSchema } from '@/lib/validations/sos'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idSos = Number(params.id)
  const row = await getSosById(session, idSos)

  if (!row) {
    return NextResponse.json({ error: 'SOS record not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'sos.update')
  if (forbidden) return forbidden

  const idSos = Number(params.id)
  const body = await request.json()
  const parsed = sosUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateSosRecord(session, idSos, parsed.data)
    if (!row) return NextResponse.json({ error: 'SOS record not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'sos.delete')
  if (forbidden) return forbidden

  const idSos = Number(params.id)
  const result = await deleteSosRecord(session, idSos)

  if (!result) {
    return NextResponse.json({ error: 'SOS record not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
