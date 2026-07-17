/**
 * GET /api/models — paginated fleet models with unit + commod counts.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { listModelsQuery, parseModelListQuery } from '@/lib/models/service'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const query = parseModelListQuery(request.nextUrl.searchParams)
  const result = await listModelsQuery(session, query)

  return NextResponse.json(result, {
    headers: {
      'X-Fleet-Source': result.source,
      'X-Fleet-Enabled': String(isFleetApiEnabled())
    }
  })
}
