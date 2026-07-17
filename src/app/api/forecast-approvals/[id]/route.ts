import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getForecastApprovalByBaPcr } from '@/lib/forecasts/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idBaPcr = Number(params.id)
  if (!Number.isFinite(idBaPcr)) {
    return NextResponse.json({ error: 'Invalid BA PCR id' }, { status: 400 })
  }

  const row = await getForecastApprovalByBaPcr(session, idBaPcr)
  if (!row) return NextResponse.json({ error: 'BA PCR not found' }, { status: 404 })

  return NextResponse.json(row)
}
