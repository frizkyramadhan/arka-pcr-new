import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createHourMeter, listHourMetersQuery, parseHourMeterListQuery } from '@/lib/hour-meter/service'
import { hourMeterSchema } from '@/lib/validations/hour-meter'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { isHeadOffice } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const query = parseHourMeterListQuery(request.nextUrl.searchParams)

  if (!isHeadOffice(session)) {
    query.projectCode = null
  }

  const result = await listHourMetersQuery(session, query)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'hour-meters.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = hourMeterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await createHourMeter(session, parsed.data, Number(session.user.id) || undefined)

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create hour meter'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
