import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { syncFleetUnitCache } from '@/lib/fleet-api/sync-cache'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  try {
    const result = await syncFleetUnitCache()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
