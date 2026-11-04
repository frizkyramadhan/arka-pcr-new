/**
 * GET /api/v1/dmbd/breakdowns/?site=&status=&position=&q=&bd_from=&bd_to=&page=1&page_size=100
 * Paginated breakdown list for other applications (read-only).
 * Auth: Bearer API token (breakdown.read). Docs: docs/dmbd-api.md.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  API_VERSION,
  apiError,
  apiJson,
  authenticateDmbdApi,
  mapBreakdownListRow,
  parsePaging
} from '@/lib/dmbd/api-v1'
import { listBreakdowns } from '@/lib/dmbd/list'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await authenticateDmbdApi(request)
  if (session instanceof NextResponse) return session

  const params = request.nextUrl.searchParams
  const paging = parsePaging(params)
  if (paging instanceof NextResponse) return paging

  const rawSite = (params.get('site') ?? params.get('project_code') ?? params.get('projectCode') ?? '').trim()
  const site = !rawSite || rawSite.toUpperCase() === 'ALL' ? '' : rawSite
  if (site && !canAccessProject(session, site)) {
    return apiError(403, 'SITE_FORBIDDEN', `No access to site ${site}`)
  }

  const sortField = (params.get('sort_field') ?? params.get('sortField') ?? 'startedAt').trim() || 'startedAt'
  const sortOrderRaw = (params.get('sort_order') ?? params.get('sortOrder') ?? 'desc').trim().toLowerCase()
  const sortOrder = sortOrderRaw === 'asc' ? 'asc' : 'desc'

  try {
    // Internal list uses 0-based page; public API uses 1-based page (same as FMS).
    const result = await listBreakdowns(session, {
      projectCode: site || undefined,
      fleetUnitId: params.get('fleet_unit_id') || params.get('fleetUnitId') || undefined,
      status: params.get('status') || undefined,
      position: params.get('position') || params.get('status_unit') || undefined,
      q: params.get('q') || undefined,
      bdFrom: params.get('bd_from') || params.get('bdFrom') || undefined,
      bdTo: params.get('bd_to') || params.get('bdTo') || undefined,
      finishFrom: params.get('finish_from') || params.get('finishFrom') || undefined,
      finishTo: params.get('finish_to') || params.get('finishTo') || undefined,
      description: params.get('description') || undefined,
      page: paging.page - 1,
      pageSize: paging.pageSize,
      sortField,
      sortOrder
    })

    return apiJson({
      site: site || 'ALL',
      page: paging.page,
      page_size: paging.pageSize,
      total: result.total,
      data: result.data.map(row => mapBreakdownListRow(row as unknown as Record<string, unknown>)),
      generated_at: new Date().toISOString(),
      api_version: API_VERSION
    })
  } catch (error) {
    console.error('[api/v1/dmbd/breakdowns]', error)

    return apiError(500, 'SERVER_ERROR', 'Failed to list breakdowns')
  }
}
