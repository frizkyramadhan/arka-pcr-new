/**
 * GET /api/v1/fms/kpi/?site=ALL&period=2026-09&view=YTD&program=
 * Public FMS KPI summary for other applications (spec section 17). Auth: `Authorization: Bearer <api token>`.
 * `kpi` holds the nine spec keys; `indicators` lists every dashboard KPI with target and status.
 * Numbers are the same as the Fundamental Maintenance Control dashboard for the same filter. Docs: docs/fms-api.md.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getMaintenanceControl } from '@/lib/fms/dashboard/control'
import { API_VERSION, apiError, apiJson, authenticateFmsApi, filterEcho, KPI_API_KEYS, mapIndicator, parseFmsFilter } from '@/lib/fms/api-v1'

export async function GET(request: NextRequest) {
  const session = await authenticateFmsApi(request)
  if (session instanceof NextResponse) return session

  const filter = await parseFmsFilter(session, request.nextUrl.searchParams)
  if (filter instanceof NextResponse) return filter

  try {
    const dashboard = await getMaintenanceControl(session, filter.query)

    const indicators = KPI_API_KEYS.filter(item => dashboard.kpis[item.code]).map(item => mapIndicator(item.key, dashboard.kpis[item.code]))
    const kpi = Object.fromEntries(KPI_API_KEYS.filter(item => item.summary).map(item => [item.key, dashboard.kpis[item.code]?.value ?? null]))

    return apiJson({
      ...filterEcho(filter),
      kpi,
      range: { start: dashboard.period.start, end: dashboard.period.end, cutoff: dashboard.period.cutoff },
      indicators,
      data_updated_at: dashboard.period.dataUpdatedAt,
      generated_at: new Date().toISOString(),
      api_version: API_VERSION
    })
  } catch (error) {
    console.error('[api/v1/fms/kpi]', error)

    return apiError(500, 'SERVER_ERROR', 'Failed to calculate KPI')
  }
}
