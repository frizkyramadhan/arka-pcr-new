import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { approveForecastLevel } from '@/lib/forecasts/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idForecastApproval = Number(params.id)
  const body = await request.json().catch(() => ({}))

  try {
    const row = await approveForecastLevel(
      session,
      idForecastApproval,
      Number(session.user.id) || 0,
      body.note
    )
    if (!row) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approve failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
