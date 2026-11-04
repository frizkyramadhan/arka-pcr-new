/**
 * GET /api/v1/dmbd/kpi/?site=ALL&period=2026-11&view=YTD&plant=&category=&status=
 * Public DMBD dashboard summary for other apps. Same numbers as /dashboards/dmbd.
 * Auth: Bearer API token (breakdown.read). Docs: docs/dmbd-api.md.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  API_VERSION,
  apiError,
  apiJson,
  authenticateDmbdApi,
  kpiFilterEcho,
  parseDmbdKpiFilter,
  toSnakeDeep
} from '@/lib/dmbd/api-v1'
import { loadDmbdDashboard } from '@/lib/dmbd/dashboard-db'

export async function GET(request: NextRequest) {
  const session = await authenticateDmbdApi(request)
  if (session instanceof NextResponse) return session

  const filter = parseDmbdKpiFilter(session, request.nextUrl.searchParams)
  if (filter instanceof NextResponse) return filter

  try {
    const dashboard = await loadDmbdDashboard(session, filter.query)
    const body = toSnakeDeep(dashboard) as Record<string, unknown>

    return apiJson({
      ...kpiFilterEcho(filter),
      ...body,
      generated_at: new Date().toISOString(),
      api_version: API_VERSION
    })
  } catch (error) {
    console.error('[api/v1/dmbd/kpi]', error)

    return apiError(500, 'SERVER_ERROR', 'Failed to calculate DMBD KPI')
  }
}
