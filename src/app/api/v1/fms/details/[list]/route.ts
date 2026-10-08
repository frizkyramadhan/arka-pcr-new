/**
 * GET /api/v1/fms/details/{list}/?site=&period=&view=&program=&page=1&page_size=100
 *   lists: pm, backlog, qc, findings, repeat-failure, reliability, availability, program
 *   narrowing: bucket=b0_7|b8_14|b15_30|gt30 (backlog), qc=FAIL (qc), severity=CRITICAL|MAJOR|MINOR,
 *              open=1, overdue=1, repeat=1 (findings)
 * Public paged version of the dashboard drill-down lists (spec sections 13 and 17). Auth: Bearer API token.
 * Permission: maintenance-dashboard.read + maintenance-dashboard.drilldown. Docs: docs/fms-api.md.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { loadControlData } from '@/lib/fms/dashboard/control'
import { buildDrilldown, DRILLDOWN_KINDS, type DrilldownKind } from '@/lib/fms/dashboard/control-drilldown'
import {
  API_VERSION,
  apiError,
  apiJson,
  authenticateFmsApi,
  FMS_API_DETAIL_PERMISSION,
  filterEcho,
  mapColumns,
  mapRows,
  parseFmsFilter,
  parsePaging
} from '@/lib/fms/api-v1'
import { hasPermission } from '@/lib/utils/api-auth'

type RouteContext = { params: { list: string } }

const BUCKETS = ['b0_7', 'b8_14', 'b15_30', 'gt30']
const SEVERITIES = ['CRITICAL', 'MAJOR', 'MINOR']

const flag = (value: string | null) => value === '1' || value?.toLowerCase() === 'true'

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await authenticateFmsApi(request)
  if (session instanceof NextResponse) return session

  if (!hasPermission(session, FMS_API_DETAIL_PERMISSION)) {
    return apiError(403, 'FORBIDDEN', `The token user lacks permission ${FMS_API_DETAIL_PERMISSION}`)
  }

  const kind = params.list as DrilldownKind
  if (!DRILLDOWN_KINDS.includes(kind)) {
    return apiError(404, 'UNKNOWN_LIST', `Unknown list "${params.list}". Use one of: ${DRILLDOWN_KINDS.join(', ')}`)
  }

  const searchParams = request.nextUrl.searchParams
  const filter = await parseFmsFilter(session, searchParams)
  if (filter instanceof NextResponse) return filter

  const paging = parsePaging(searchParams)
  if (paging instanceof NextResponse) return paging

  const bucket = searchParams.get('bucket')?.trim() || null
  if (bucket && !BUCKETS.includes(bucket)) return apiError(400, 'INVALID_PARAMETER', `bucket must be one of ${BUCKETS.join(', ')}`)
  const severity = searchParams.get('severity')?.trim().toUpperCase() || null
  if (severity && !SEVERITIES.includes(severity)) return apiError(400, 'INVALID_PARAMETER', `severity must be one of ${SEVERITIES.join(', ')}`)
  const qc = searchParams.get('qc')?.trim().toUpperCase() || null
  if (qc && qc !== 'FAIL') return apiError(400, 'INVALID_PARAMETER', 'qc only accepts FAIL')

  const options = {
    bucket,
    severity,
    qc,
    open: flag(searchParams.get('open')),
    overdue: flag(searchParams.get('overdue')),
    repeat: flag(searchParams.get('repeat'))
  }

  try {
    const data = await loadControlData(session, filter.query)
    const list = buildDrilldown(data, kind, options)

    const total = list.rows.length
    const totalPages = Math.max(1, Math.ceil(total / paging.pageSize))
    const pageRows = list.rows.slice((paging.page - 1) * paging.pageSize, paging.page * paging.pageSize)

    return apiJson({
      list: kind,
      title: list.title,
      subtitle: list.subtitle,
      ...filterEcho(filter),
      options: Object.fromEntries(Object.entries(options).filter(([, value]) => value)),
      range: { start: list.period.start, end: list.period.end, cutoff: list.period.cutoff },
      summary: (list.summary as { label: string; value: unknown; unit?: string }[]).map(item => ({
        label: item.label,
        value: item.value,
        ...(item.unit ? { unit: item.unit } : {})
      })),
      columns: mapColumns(list.columns),
      data: mapRows(list, pageRows as Record<string, unknown>[]),
      pagination: { page: paging.page, page_size: paging.pageSize, total, total_pages: totalPages },
      data_updated_at: data.dataUpdatedAt,
      generated_at: new Date().toISOString(),
      api_version: API_VERSION
    })
  } catch (error) {
    console.error(`[api/v1/fms/details/${kind}]`, error)

    return apiError(500, 'SERVER_ERROR', 'Failed to load list')
  }
}
