/**
 * GET /api/v1/dmbd/meta/
 * Reference for DMBD API clients: token user, sites in scope, filters, endpoints.
 * Auth: Bearer API token (breakdown.read). Docs: docs/dmbd-api.md.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  API_VERSION,
  DEFAULT_PAGE_SIZE,
  DMBD_API_PERMISSION,
  MAX_PAGE_SIZE,
  apiError,
  apiJson,
  authenticateDmbdApi
} from '@/lib/dmbd/api-v1'
import { listProjectsForSession } from '@/lib/fleet-api/equipment-service'
import { hasAllProjectsAccess } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await authenticateDmbdApi(request)
  if (session instanceof NextResponse) return session

  try {
    const projects = await listProjectsForSession(session)

    return apiJson({
      user: {
        id: Number(session.user.id),
        name: session.user.name,
        all_sites: hasAllProjectsAccess(session),
        permission: DMBD_API_PERMISSION
      },
      sites: [
        { code: 'ALL', name: 'All sites in scope' },
        ...projects.map(project => ({
          code: project.project_code,
          name: project.location || project.bowheer || project.project_code
        }))
      ],
      views: ['MTD', 'YTD'],
      status_filters: ['breakdown', 'waiting_part', 'under_repair', 'ready'],
      status_unit_filters: ['BD', 'OP', 'SB', 'AJ', 'RFU', 'CANCEL'],
      work_order_status_filters: ['open', 'closed', 'cancelled'],
      endpoints: [
        { path: '/api/v1/dmbd/meta/', method: 'GET', description: 'This reference payload' },
        {
          path: '/api/v1/dmbd/kpi/',
          method: 'GET',
          description: 'DMBD dashboard KPI + unit rows (same numbers as /dashboards/dmbd)'
        },
        {
          path: '/api/v1/dmbd/breakdowns/',
          method: 'GET',
          description: 'Paginated breakdown list'
        },
        {
          path: '/api/v1/dmbd/breakdowns/{id}/',
          method: 'GET',
          description: 'One breakdown with activities'
        }
      ],
      kpi_keys: [
        'total_units',
        'breakdown',
        'waiting_part',
        'under_repair',
        'ready',
        'lost_hours',
        'mttr_hours',
        'mtbf_hours',
        'availability'
      ],
      paging: { default_page_size: DEFAULT_PAGE_SIZE, max_page_size: MAX_PAGE_SIZE },
      api_version: API_VERSION
    })
  } catch (error) {
    console.error('[api/v1/dmbd/meta]', error)

    return apiError(500, 'SERVER_ERROR', 'Failed to load reference data')
  }
}
