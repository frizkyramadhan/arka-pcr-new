import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteHourMeter, getHourMeterById, updateHourMeter } from '@/lib/hour-meter/service'
import { hourMeterUpdateSchema } from '@/lib/validations/hour-meter'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idHm = Number(params.id)
  if (Number.isNaN(idHm)) {
    return NextResponse.json({ error: 'Invalid hour meter id' }, { status: 400 })
  }

  const row = await getHourMeterById(session, idHm)
  if (!row) {
    return NextResponse.json({ error: 'Hour meter not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'hour-meters.update')
  if (forbidden) return forbidden

  const idHm = Number(params.id)
  if (Number.isNaN(idHm)) {
    return NextResponse.json({ error: 'Invalid hour meter id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = hourMeterUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await updateHourMeter(session, idHm, parsed.data)
    if (!row) {
      return NextResponse.json({ error: 'Hour meter not found' }, { status: 404 })
    }

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update hour meter'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'hour-meters.delete')
  if (forbidden) return forbidden

  const idHm = Number(params.id)
  if (Number.isNaN(idHm)) {
    return NextResponse.json({ error: 'Invalid hour meter id' }, { status: 400 })
  }

  const result = await deleteHourMeter(session, idHm)
  if (!result) {
    return NextResponse.json({ error: 'Hour meter not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
