/**
 * Shared pieces of the public FMS API (`/api/v1/fms/*`, spec section 17) used by other applications.
 *
 * - Auth: `Authorization: Bearer <api token>` (see lib/api-tokens.ts); a logged-in browser session also works,
 *   so the endpoints can be tried from the browser.
 * - Errors: `{ "error": { "code": "...", "message": "..." } }` with the matching HTTP status.
 * - Filters: site / period / view / program, mapped onto the dashboard's ControlQuery so the API returns the
 *   same numbers as `/dashboards/maintenance-control`.
 * - Output keys are snake_case; drill-down cells are flattened into plain JSON values.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'

import { authenticateApiToken } from '@/lib/api-tokens'
import type { ControlKpi, ControlQuery } from '@/lib/fms/dashboard/control'
import type { DrilldownColumn, DrilldownList } from '@/lib/fms/dashboard/control-drilldown'
import { getAppBaseUrl } from '@/lib/notifications/mailer'
import { prisma } from '@/lib/prisma'
import { hasPermission, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

/** Permission every FMS API call needs (same as viewing the dashboard). */
export const FMS_API_PERMISSION = 'maintenance-dashboard.read'

/** Extra permission for `/api/v1/fms/details/*` (same as dashboard drill-down). */
export const FMS_API_DETAIL_PERMISSION = 'maintenance-dashboard.drilldown'

export const API_VERSION = 'v1'

/** Paging for detail lists. */
export const DEFAULT_PAGE_SIZE = 100

export const MAX_PAGE_SIZE = 1000

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function apiJson(body: unknown) {
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}

const clientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.ip || null

const AUTH_MESSAGES: Record<string, string> = {
  invalid: 'API token is not valid',
  revoked: 'API token has been revoked',
  expired: 'API token has expired',
  user_inactive: 'The user of this API token is inactive'
}

/**
 * Bearer token first; without an Authorization header falls back to the browser session.
 * Returns the session (token owner) or an error response. Also checks the FMS read permission.
 */
export async function authenticateFmsApi(request: NextRequest): Promise<Session | NextResponse> {
  const header = request.headers.get('authorization')
  let session: Session

  if (header) {
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim())
    if (!match) return apiError(401, 'UNAUTHORIZED', 'Use the header "Authorization: Bearer <token>"')

    const result = await authenticateApiToken(match[1], clientIp(request))
    if (!result.ok) return apiError(401, 'UNAUTHORIZED', AUTH_MESSAGES[result.reason])
    session = result.session
  } else {
    const fromCookie = await requireSession(request)
    if (fromCookie instanceof NextResponse) return apiError(401, 'UNAUTHORIZED', 'Missing "Authorization: Bearer <token>" header')
    session = fromCookie
  }

  if (!hasPermission(session, FMS_API_PERMISSION)) {
    return apiError(403, 'FORBIDDEN', `The token user lacks permission ${FMS_API_PERMISSION}`)
  }

  return session
}

export type FmsFilter = {
  site: string
  period: string
  view: 'MTD' | 'YTD'
  program: { id: string; name: string } | null
  query: ControlQuery
}

/**
 * Parses `site`, `period`, `view`, `program`. Defaults: site=ALL, period=current month, view=YTD, all programs.
 * Rejects a site outside the user's scope with 403 instead of silently returning zeros.
 */
export async function parseFmsFilter(session: Session, params: URLSearchParams): Promise<FmsFilter | NextResponse> {
  const rawSite = (params.get('site') ?? 'ALL').trim()
  const site = !rawSite || rawSite.toUpperCase() === 'ALL' ? 'ALL' : rawSite
  if (site !== 'ALL' && !canAccessProject(session, site)) {
    return apiError(403, 'SITE_FORBIDDEN', `No access to site ${site}`)
  }

  const now = new Date()
  const rawPeriod = (params.get('period') ?? '').trim()
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  if (rawPeriod) {
    const match = /^(\d{4})-(\d{2})$/.exec(rawPeriod)
    if (!match) return apiError(400, 'INVALID_PARAMETER', 'period must be YYYY-MM, e.g. 2026-09')
    year = Number(match[1])
    month = Number(match[2])
    if (year < 2000 || year > 2100 || month < 1 || month > 12) {
      return apiError(400, 'INVALID_PARAMETER', 'period is out of range')
    }
  }

  const rawView = (params.get('view') ?? 'YTD').trim().toUpperCase()
  if (rawView !== 'MTD' && rawView !== 'YTD') return apiError(400, 'INVALID_PARAMETER', 'view must be MTD or YTD')
  const view = rawView

  const rawProgram = (params.get('program') ?? '').trim()
  let program: FmsFilter['program'] = null
  if (rawProgram && rawProgram.toUpperCase() !== 'ALL') {
    const types = await prisma.maintenanceType.findMany({ select: { id: true, name: true } })
    program =
      types.find(type => type.id === rawProgram) ?? types.find(type => type.name.toLowerCase() === rawProgram.toLowerCase()) ?? null
    if (!program) return apiError(400, 'INVALID_PARAMETER', `Unknown program ${rawProgram}; see /api/v1/fms/meta`)
  }

  return {
    site,
    period: `${year}-${String(month).padStart(2, '0')}`,
    view,
    program,
    query: { year, month, mode: view, projectId: site === 'ALL' ? null : site, programId: program?.id ?? null }
  }
}

/** Echo of the applied filter, included in every response. */
export const filterEcho = (filter: FmsFilter) => ({
  site: filter.site,
  period: filter.period,
  view: filter.view,
  program: filter.program
})

/**
 * API key for each dashboard KPI code. The first nine are the spec section 17 keys and form the `kpi` object;
 * all of them appear in `indicators`.
 */
export const KPI_API_KEYS: { code: string; key: string; summary: boolean }[] = [
  { code: 'PM_COMPLIANCE', key: 'pm_compliance', summary: true },
  { code: 'ON_TIME_COMPLIANCE', key: 'on_time_compliance', summary: true },
  { code: 'BACKLOG_GT30', key: 'backlog_gt30', summary: true },
  { code: 'QC_PASS_RATE', key: 'qc_pass_rate', summary: true },
  { code: 'FAILURE_CLOSURE', key: 'finding_closure', summary: true },
  { code: 'REPEAT_FAILURE', key: 'repeat_failure_rate', summary: true },
  { code: 'MTBF', key: 'mtbf_hours', summary: true },
  { code: 'MTTR', key: 'mttr_hours', summary: true },
  { code: 'PA_AVAILABILITY', key: 'availability', summary: true },
  { code: 'SCHEDULE_ADHERENCE', key: 'schedule_adherence', summary: false },
  { code: 'OVERDUE_MAINTENANCE', key: 'overdue_maintenance', summary: false },
  { code: 'TOTAL_BACKLOG', key: 'total_backlog', summary: false },
  { code: 'BACKLOG_0_7', key: 'backlog_0_7', summary: false },
  { code: 'BACKLOG_8_14', key: 'backlog_8_14', summary: false },
  { code: 'BACKLOG_15_30', key: 'backlog_15_30', summary: false },
  { code: 'CRITICAL_BACKLOG', key: 'critical_backlog', summary: false },
  { code: 'REPEAT_FINDING', key: 'repeat_finding_rate', summary: false },
  { code: 'CRITICAL_FAILURE', key: 'critical_findings_open', summary: false },
  { code: 'FAILURE_FREQUENCY', key: 'failure_frequency', summary: false }
]

/** Drill-down list that explains each KPI (for `/details/{list}`). */
export const KPI_DETAIL_LIST: Record<string, string> = {
  PM_COMPLIANCE: 'pm',
  ON_TIME_COMPLIANCE: 'pm',
  SCHEDULE_ADHERENCE: 'pm',
  OVERDUE_MAINTENANCE: 'pm',
  TOTAL_BACKLOG: 'backlog',
  BACKLOG_0_7: 'backlog?bucket=b0_7',
  BACKLOG_8_14: 'backlog?bucket=b8_14',
  BACKLOG_15_30: 'backlog?bucket=b15_30',
  BACKLOG_GT30: 'backlog?bucket=gt30',
  CRITICAL_BACKLOG: 'findings?severity=CRITICAL&open=1&overdue=1',
  QC_PASS_RATE: 'qc',
  REPEAT_FINDING: 'findings?repeat=1',
  FAILURE_CLOSURE: 'findings',
  CRITICAL_FAILURE: 'findings?severity=CRITICAL&open=1',
  PA_AVAILABILITY: 'availability',
  MTBF: 'reliability',
  MTTR: 'reliability',
  REPEAT_FAILURE: 'repeat-failure',
  FAILURE_FREQUENCY: 'findings'
}

const UNIT_LABEL: Record<ControlKpi['unit'], string> = { '%': 'percent', hrs: 'hours', count: 'count' }

/** One KPI as returned in `indicators`. */
export function mapIndicator(key: string, kpi: ControlKpi) {
  return {
    key,
    code: kpi.code,
    label: kpi.label,
    value: kpi.value,
    unit: UNIT_LABEL[kpi.unit],
    target: kpi.target
      ? { value: kpi.target.targetValue, direction: kpi.target.direction, yellow_margin: kpi.target.yellowMargin }
      : null,
    status: kpi.color,
    state: kpi.state === 'ready' ? 'ready' : 'no_data',
    note: kpi.note,
    detail: kpi.detail,
    detail_list: KPI_DETAIL_LIST[kpi.code] ?? null
  }
}

export const toSnake = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

const COLUMN_TYPE: Record<string, string> = { wo: 'work_order', chip: 'status', reason: 'reason', list: 'list' }

export const mapColumns = (columns: DrilldownColumn[]) =>
  columns.map(column => ({ key: toSnake(column.key), label: column.label, type: COLUMN_TYPE[column.type ?? 'text'] ?? column.type ?? 'text' }))

/** Flattens UI cell objects (work-order link, chip, reason) into plain JSON values for API clients. */
function mapCell(type: DrilldownColumn['type'], value: unknown, baseUrl: string) {
  if (value == null) return null
  if (type === 'wo') {
    const cell = value as { id: string | null; no: string | null; note?: string | null }
    if (!cell.id) return null

    return {
      id: cell.id,
      reg_no: cell.no,
      url: `${baseUrl}/maintenance-actuals/view/${cell.id}/`,
      ...(cell.note ? { date: cell.note } : {})
    }
  }
  if (type === 'chip') return (value as { label: string }).label
  if (type === 'reason') {
    const cell = value as { detailId: string; text: string | null; updatedAt: string | null; updatedBy: string | null }

    return { plan_detail_id: cell.detailId, text: cell.text, updated_by: cell.updatedBy, updated_at: cell.updatedAt }
  }

  return value
}

/** Drill-down rows → API rows (snake_case keys, flattened cells). */
export function mapRows(list: DrilldownList, rows: Record<string, unknown>[]) {
  const baseUrl = getAppBaseUrl()
  const types = new Map(list.columns.map(column => [column.key, column.type]))

  return rows.map(row => {
    const out: Record<string, unknown> = { id: row.id }
    for (const column of list.columns) out[toSnake(column.key)] = mapCell(types.get(column.key), row[column.key], baseUrl)

    return out
  })
}

/** Reads `page` and `page_size` (1-based page). */
export function parsePaging(params: URLSearchParams): { page: number; pageSize: number } | NextResponse {
  const page = params.has('page') ? Number(params.get('page')) : 1
  const pageSize = params.has('page_size') ? Number(params.get('page_size')) : DEFAULT_PAGE_SIZE
  if (!Number.isInteger(page) || page < 1) return apiError(400, 'INVALID_PARAMETER', 'page must be a whole number ≥ 1')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return apiError(400, 'INVALID_PARAMETER', `page_size must be between 1 and ${MAX_PAGE_SIZE}`)
  }

  return { page, pageSize }
}
