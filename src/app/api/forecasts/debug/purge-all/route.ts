/**
 * DELETE all PCR forecasts + approvals — development debug only.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { purgeAllForecastsDebug } from '@/lib/forecasts/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function DELETE(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 403 })
  }

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.delete')
  if (forbidden) return forbidden

  try {
    const result = await purgeAllForecastsDebug()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Debug purge failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
