/**
 * Public DMBD API (`/api/v1/dmbd/*`) for other applications.
 * Auth: Bearer API token (same System → API Tokens as FMS) or browser session.
 * Permission: breakdown.read. Site scope follows the token user.
 * Numbers for /kpi match the DMBD dashboard for the same filter.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'

import { authenticateApiToken } from '@/lib/api-tokens'
import {
  API_VERSION,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  apiError,
  apiJson,
  parsePaging,
  toSnake
} from '@/lib/fms/api-v1'
import { hasPermission, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export { API_VERSION, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, apiError, apiJson, parsePaging, toSnake }

/** Same permission as viewing Breakdown / DMBD dashboard. */
export const DMBD_API_PERMISSION = 'breakdown.read'

const AUTH_MESSAGES: Record<string, string> = {
  invalid: 'API token is not valid',
  revoked: 'API token has been revoked',
  expired: 'API token has expired',
  user_inactive: 'The user of this API token is inactive'
}

const clientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.ip || null

/**
 * Bearer token first; without Authorization falls back to browser session.
 * Requires breakdown.read on the token user.
 */
export async function authenticateDmbdApi(request: NextRequest): Promise<Session | NextResponse> {
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
    if (fromCookie instanceof NextResponse) {
      return apiError(401, 'UNAUTHORIZED', 'Missing "Authorization: Bearer <token>" header')
    }
    session = fromCookie
  }

  if (!hasPermission(session, DMBD_API_PERMISSION)) {
    return apiError(403, 'FORBIDDEN', `The token user lacks permission ${DMBD_API_PERMISSION}`)
  }

  return session
}

export type DmbdApiFilter = {
  site: string
  period: string | null
  view: 'MTD' | 'YTD' | null
  date: string | null
  plant: string | null
  category: string | null
  status: string | null
  query: {
    projectCode?: string
    plant?: string
    category?: string
    status?: string
    date?: string
    period?: string
    mode?: string
  }
}

/**
 * Parses site / period / view / date / plant / category / status for /kpi.
 * Defaults: site=ALL, view=YTD, period=current month (same spirit as the DMBD UI).
 */
export function parseDmbdKpiFilter(session: Session, params: URLSearchParams): DmbdApiFilter | NextResponse {
  const rawSite = (params.get('site') ?? params.get('projectCode') ?? 'ALL').trim()
  const site = !rawSite || rawSite.toUpperCase() === 'ALL' ? 'ALL' : rawSite
  if (site !== 'ALL' && !canAccessProject(session, site)) {
    return apiError(403, 'SITE_FORBIDDEN', `No access to site ${site}`)
  }

  const rawView = (params.get('view') ?? params.get('mode') ?? 'YTD').trim().toUpperCase()
  let view: DmbdApiFilter['view'] = null
  if (rawView === 'MTD' || rawView === 'YTD') view = rawView
  else if (rawView && rawView !== 'DAY' && rawView !== 'LIVE') {
    return apiError(400, 'INVALID_PARAMETER', 'view must be MTD, YTD, or omit for live/day mode')
  }

  const now = new Date()
  let period: string | null = null
  const rawPeriod = (params.get('period') ?? '').trim()
  if (rawPeriod) {
    const match = /^(\d{4})-(\d{2})$/.exec(rawPeriod)
    if (!match) return apiError(400, 'INVALID_PARAMETER', 'period must be YYYY-MM, e.g. 2026-11')
    const year = Number(match[1])
    const month = Number(match[2])
    if (year < 2000 || year > 2100 || month < 1 || month > 12) {
      return apiError(400, 'INVALID_PARAMETER', 'period is out of range')
    }
    period = `${year}-${String(month).padStart(2, '0')}`
  } else if (view) {
    period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const date = (params.get('date') ?? '').trim() || null
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return apiError(400, 'INVALID_PARAMETER', 'date must be YYYY-MM-DD')
  }

  const plant = (params.get('plant') ?? '').trim() || null
  const category = (params.get('category') ?? '').trim() || null
  const status = (params.get('status') ?? '').trim() || null
  if (status && !['breakdown', 'waiting_part', 'under_repair', 'ready'].includes(status)) {
    return apiError(
      400,
      'INVALID_PARAMETER',
      'status must be breakdown, waiting_part, under_repair, or ready'
    )
  }

  return {
    site,
    period,
    view,
    date,
    plant,
    category,
    status,
    query: {
      projectCode: site === 'ALL' ? undefined : site,
      plant: plant || undefined,
      category: category || undefined,
      status: status || undefined,
      date: date || undefined,
      period: period || undefined,
      mode: view || undefined
    }
  }
}

export const kpiFilterEcho = (filter: DmbdApiFilter) => ({
  site: filter.site,
  period: filter.period,
  view: filter.view,
  date: filter.date,
  plant: filter.plant,
  category: filter.category,
  status: filter.status
})

/** Map camelCase keys recursively for public JSON (arrays of plain objects). */
export function toSnakeDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnakeDeep)
  if (value == null || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString()

  const out: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[toSnake(key)] = toSnakeDeep(nested)
  }

  return out
}

/** Public list row shape (snake_case). */
export function mapBreakdownListRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    register_no: row.registerNo ?? null,
    list_no: row.listNo ?? null,
    project_code: row.projectCode ?? null,
    fleet_unit_id: row.fleetUnitId ?? null,
    unit_no: row.unitNo ?? null,
    model_name: row.modelName ?? null,
    plant_group: row.plantGroup ?? null,
    plant_type: row.plantType ?? null,
    started_at: row.startedAt ?? null,
    finished_at: row.finishedAt ?? null,
    cancelled_at: row.cancelledAt ?? null,
    problem: row.problem ?? null,
    hour_meter: row.hourMeter ?? null,
    operator_code: row.operatorCode ?? null,
    operator_name: row.operatorName ?? null,
    mechanic_leader_code: row.mechanicLeaderCode ?? null,
    mechanic_leader_name: row.mechanicLeaderName ?? null,
    remark: row.remark ?? null,
    work_order: row.workOrder ?? null,
    work_order_status: row.workOrderStatus ?? null,
    status_unit: row.statusUnit ?? null,
    downtime_hours: row.downtimeHours ?? null,
    component_code: row.componentCode ?? null,
    component_name: row.componentName ?? null,
    latest_position: row.latestPosition ?? null,
    latest_code: row.latestCode ?? null,
    latest_code_name: row.latestCodeName ?? null
  }
}

/** Public detail shape including activities. */
export function mapBreakdownDetail(row: Record<string, unknown>) {
  const activities = Array.isArray(row.activities) ? row.activities : []

  return {
    id: row.id,
    register_no: row.registerNo ?? null,
    list_no: row.listNo ?? null,
    project_code: row.projectCode ?? null,
    fleet_unit_id: row.fleetUnitId ?? null,
    unit_no: row.unitNo ?? null,
    model_name: row.modelName ?? null,
    started_at: row.startedAt ?? null,
    finished_at: row.finishedAt ?? null,
    cancelled_at: row.cancelledAt ?? null,
    problem: row.problem ?? null,
    resolution: row.resolution ?? null,
    hour_meter: row.hourMeter ?? null,
    work_order: row.workOrder ?? null,
    sap_service_call_id: row.sapServiceCallId ?? null,
    work_order_status: row.workOrderStatus ?? null,
    serial_no: row.serialNo ?? null,
    location: row.location ?? null,
    job_category: row.jobCategory ?? null,
    job_code: row.jobCode ?? null,
    job_code_name: row.jobCodeName ?? null,
    component_code: row.componentCode ?? null,
    component_name: row.componentName ?? null,
    sub_component_code: row.subComponentCode ?? null,
    sub_component_name: row.subComponentName ?? null,
    damage_code: row.damageCode ?? null,
    damage_name: row.damageName ?? null,
    failure_cause_code: row.failureCauseCode ?? null,
    failure_cause_name: row.failureCauseName ?? null,
    operator_code: row.operatorCode ?? null,
    operator_name: row.operatorName ?? null,
    mechanic_leader_code: row.mechanicLeaderCode ?? null,
    mechanic_leader_name: row.mechanicLeaderName ?? null,
    prepared_by: row.preparedBy ?? null,
    assignee_user_id: row.assigneeUserId ?? null,
    assignee_name: row.assigneeName ?? null,
    remark: row.remark ?? null,
    created_by_name: row.createdByName ?? null,
    activities: activities.map((activity: Record<string, unknown>) => ({
      id: activity.id,
      sap_activity_code: activity.sapActivityCode ?? null,
      activity_category: activity.activityCategory ?? null,
      breakdown_code: activity.breakdownCode ?? null,
      breakdown_code_name: activity.breakdownCodeName ?? null,
      position_status: activity.positionStatus ?? null,
      started_at: activity.startedAt ?? null,
      ended_at: activity.endedAt ?? null,
      details: activity.details ?? null,
      technician_name: activity.technicianName ?? null,
      handled_by: activity.handledBy ?? null,
      handled_by_name: activity.handledByName ?? null
    }))
  }
}
