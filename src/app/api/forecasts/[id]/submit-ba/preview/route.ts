import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getSubmitBaPcrPreview } from '@/lib/forecasts/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idForecast = Number(params.id)

  try {
    const preview = await getSubmitBaPcrPreview(session, idForecast)
    if (!preview) return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })

    return NextResponse.json(preview)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
