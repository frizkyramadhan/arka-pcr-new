/**
 * GET /api/v1/fms/meta/
 * Reference data for API clients: who the token acts as, sites it may read, programs, KPI keys and detail lists.
 * Auth: Bearer API token. Docs: docs/fms-api.md.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listProjectsForSession } from '@/lib/fleet-api/equipment-service'
import { API_VERSION, apiError, apiJson, authenticateFmsApi, KPI_API_KEYS, KPI_DETAIL_LIST, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/lib/fms/api-v1'
import { DRILLDOWN_KINDS } from '@/lib/fms/dashboard/control-drilldown'
import { KPI_DEFINITIONS } from '@/lib/fms/kpi-targets'
import { prisma } from '@/lib/prisma'
import { hasAllProjectsAccess } from '@/lib/utils/project-scope'

/** Optional narrowing each detail list accepts. */
const LIST_OPTIONS: Record<string, string[]> = {
  pm: [],
  backlog: ['bucket=b0_7|b8_14|b15_30|gt30'],
  qc: ['qc=FAIL'],
  findings: ['severity=CRITICAL|MAJOR|MINOR', 'open=1', 'overdue=1', 'repeat=1'],
  'repeat-failure': [],
  reliability: [],
  availability: [],
  program: []
}

/** KPI labels and units not covered by the KPI target definitions (count-only cards). */
const EXTRA_KPI: Record<string, { label: string; unit: string }> = {
  TOTAL_BACKLOG: { label: 'Total Backlog', unit: 'count' },
  BACKLOG_0_7: { label: '0–7 Days', unit: 'count' },
  BACKLOG_8_14: { label: '8–14 Days', unit: 'count' },
  BACKLOG_15_30: { label: '15–30 Days', unit: 'count' },
  FAILURE_FREQUENCY: { label: 'Failure Frequency', unit: 'count' }
}

const UNIT_LABEL: Record<string, string> = { '%': 'percent', hrs: 'hours', count: 'count' }

export async function GET(request: NextRequest) {
  const session = await authenticateFmsApi(request)
  if (session instanceof NextResponse) return session

  try {
    const [projects, programs] = await Promise.all([
      listProjectsForSession(session),
      prisma.maintenanceType.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    ])

    const definitions = new Map<string, { label: string; unit: string }>(KPI_DEFINITIONS.map(item => [item.code, item]))

    return apiJson({
      user: { id: Number(session.user.id), name: session.user.name, all_sites: hasAllProjectsAccess(session) },
      sites: [
        { code: 'ALL', name: 'All sites in scope' },
        ...projects.map(project => ({ code: project.project_code, name: project.location || project.bowheer || project.project_code }))
      ],
      programs,
      views: ['MTD', 'YTD'],
      kpis: KPI_API_KEYS.map(item => {
        const definition = definitions.get(item.code) ?? EXTRA_KPI[item.code]

        return {
          key: item.key,
          code: item.code,
          label: definition?.label ?? item.code,
          unit: UNIT_LABEL[definition?.unit ?? ''] ?? definition?.unit ?? null,
          in_summary: item.summary,
          detail_list: KPI_DETAIL_LIST[item.code] ?? null
        }
      }),
      lists: DRILLDOWN_KINDS.map(kind => ({ list: kind, options: LIST_OPTIONS[kind] ?? [] })),
      paging: { default_page_size: DEFAULT_PAGE_SIZE, max_page_size: MAX_PAGE_SIZE },
      api_version: API_VERSION
    })
  } catch (error) {
    console.error('[api/v1/fms/meta]', error)

    return apiError(500, 'SERVER_ERROR', 'Failed to load reference data')
  }
}
