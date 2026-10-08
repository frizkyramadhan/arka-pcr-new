/**
 * Fundamental Maintenance Control dashboard — every number on /dashboards/maintenance-control.
 *
 * Population: dated plan rows (maintenance_plan_details) and the actual linked to each row. The plan date is the
 * due date (the schema has no separate due date). Actual CANCELLED counts as no actual. Legacy monthly quotas without
 * plan dates are not counted. Findings come from maintenance_failures; PA from calendar hours × active units minus finding downtime; operating hours
 * for MTBF from hm readings.
 *
 * Global filters (spec section 5): site, period (month), MTD/YTD, and an optional program. The program narrows plan
 * rows and findings (via the actual's plan type), so PA counts only that program's finding downtime; repeat failure
 * still looks at history from every program.
 *
 * Each KPI says whether it can be shown: `ready` (has data), `no-data` (source exists but is empty for the filter),
 * or `not-built` (the design asks for it but the data model can't produce it yet).
 */
import type { Session } from 'next-auth'

import { kpiStatusColor, resolveKpiTarget, type KpiCode, type KpiColor, type ResolvedKpiTarget } from '@/lib/fms/kpi-targets'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { resolveProjectFilter } from '@/lib/utils/project-scope'

const DAY_MS = 86400000

/** Months shown in the backlog aging chart, ending at the selected month. */
const BACKLOG_TREND_MONTHS = 5

/** hm readings before the period start that may serve as the opening reading for operating hours. */
const HM_LOOKBACK_DAYS = 62

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type ControlMode = 'MTD' | 'YTD'

export type KpiState = 'ready' | 'no-data' | 'not-built'

export type ControlKpi = {
  code: string
  label: string
  value: number | null
  unit: '%' | 'hrs' | 'count'
  target: ResolvedKpiTarget | null
  color: KpiColor | null
  state: KpiState
  note: string | null
  detail: string | null
}

type Bucket = { b0_7: number; b8_14: number; b15_30: number; gt30: number }

/** One dated plan row (the job) with its non-cancelled actual (the WO), if any. */
export type PlanRow = {
  detailId: string
  fleetUnitId: number
  unitNo: string
  planIso: string
  projectId: string
  typeId: string
  typeName: string
  plannerName: string | null
  pendingReason: string | null
  pendingReasonUpdatedAt: string | null
  pendingReasonUpdatedBy: string | null
  actualId: string | null
  registerNo: string | null
  actualIso: string | null
  qcStatus: string | null
  picName: string | null
  mechanics: string | null
  remarks: string | null
}

export type FindingRow = {
  id: string
  fleetUnitId: number
  unitNo: string
  projectId: string
  severity: string
  occurredIso: string
  closureIso: string | null
  componentCode: string | null
  componentName: string | null
  damageCode: string | null
  damageName: string | null
  description: string
  typeId: string | null
  typeName: string | null
  actualId: string | null
  registerNo: string | null
  picName: string | null
  repeatFinding: boolean
}

export const dayNumber = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)

  return Date.UTC(year, month - 1, day) / DAY_MS
}

const pad = (value: number) => String(value).padStart(2, '0')
const monthStartIso = (year: number, month: number) => `${year}-${pad(month)}-01`

const monthEndIso = (year: number, month: number) => {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return `${year}-${pad(month)}-${pad(last)}`
}
const isoToUtcDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const minIso = (a: string, b: string) => (a < b ? a : b)

/** FMS_DASHBOARD_TODAY (YYYY-MM-DD) moves the cut-off for local demo data; ignored in production builds. */
function dashboardTodayIso() {
  const override = process.env.FMS_DASHBOARD_TODAY?.trim()
  if (process.env.NODE_ENV !== 'production' && override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override

  return toIsoDateOnly(new Date()) as string
}

export const between = (iso: string, start: string, end: string) => iso >= start && iso <= end

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null)

export const round1 = (value: number) => Math.round(value * 10) / 10

function emptyBucket(): Bucket {
  return { b0_7: 0, b8_14: 0, b15_30: 0, gt30: 0 }
}

function addToBucket(bucket: Bucket, ageDays: number) {
  if (ageDays <= 7) bucket.b0_7 += 1
  else if (ageDays <= 14) bucket.b8_14 += 1
  else if (ageDays <= 30) bucket.b15_30 += 1
  else bucket.gt30 += 1
}

/** Plan-row KPIs for one window. Due = plan date on or before the cut-off. */
function executionStats(rows: PlanRow[], start: string, end: string, cutoff: string) {
  const inPeriod = rows.filter(row => between(row.planIso, start, end))
  const due = inPeriod.filter(row => row.planIso <= cutoff)
  const executed = inPeriod.filter(row => row.actualIso)
  const qcChecked = executed.filter(row => row.qcStatus === 'PASS' || row.qcStatus === 'FAIL')

  return {
    plan: inPeriod.length,
    due: due.length,
    executed: executed.length,
    onSchedule: executed.filter(row => row.actualIso === row.planIso).length,
    onTime: due.filter(row => row.actualIso && row.actualIso <= row.planIso).length,
    overdue: due.filter(row => (row.actualIso ? row.actualIso > row.planIso : row.planIso < cutoff)).length,
    qcChecked: qcChecked.length,
    qcPass: qcChecked.filter(row => row.qcStatus === 'PASS').length
  }
}

/** Open plan rows at the cut-off by days past the plan date (spec section 10). */
function backlogAt(rows: PlanRow[], cutoff: string) {
  const bucket = emptyBucket()
  for (const row of rows) {
    if (row.planIso > cutoff) continue
    if (row.actualIso && row.actualIso <= cutoff) continue
    addToBucket(bucket, dayNumber(cutoff) - dayNumber(row.planIso))
  }

  return bucket
}

/**
 * Running hours in the window for the given units: sum of increases between consecutive hm readings that end inside
 * the window. Zero readings, meter resets, and increases above 24 h per elapsed day are skipped as bad readings
 * (the hm table has odometer-like jumps on some units).
 */
export function operatingHours(readings: Map<number, { iso: string; hm: number }[]>, unitIds: Set<number>, start: string, end: string) {
  let total = 0
  for (const unitId of unitIds) {
    const list = (readings.get(unitId) ?? []).filter(item => item.hm > 0 && item.iso <= end)
    for (let index = 1; index < list.length; index += 1) {
      const previous = list[index - 1]
      const current = list[index]
      if (current.iso < start) continue
      const increase = current.hm - previous.hm
      const maxHours = (dayNumber(current.iso) - dayNumber(previous.iso)) * 24
      if (increase > 0 && increase <= maxHours) total += increase
    }
  }

  return total
}

/** Units in the maintenance population of a window: plan rows or findings in it. */
export function unitsIn(plans: PlanRow[], findings: FindingRow[], start: string, end: string) {
  const ids = new Set<number>()
  for (const row of plans) if (between(row.planIso, start, end)) ids.add(row.fleetUnitId)
  for (const row of findings) if (between(row.occurredIso, start, end)) ids.add(row.fleetUnitId)

  return ids
}

/** Average hours from finding date to closure date, for findings closed in the window. */
function mttrHours(findings: FindingRow[], start: string, end: string) {
  const closed = findings.filter(row => row.closureIso && between(row.closureIso, start, end))
  if (!closed.length) return { value: null, count: 0 }
  const hours = closed.reduce((sum, row) => sum + (dayNumber(row.closureIso as string) - dayNumber(row.occurredIso)) * 24, 0)

  return { value: round1(hours / closed.length), count: closed.length }
}

/**
 * PA = (calendar hours × units − downtime) ÷ (calendar hours × units).
 * Units = active fleet units in scope plus any unit with downtime in the window.
 * Downtime per unit = days covered by its findings (finding date → closure date, open → openUntil),
 * clipped to the window; overlapping findings on one unit are merged so hours are not counted twice.
 */
function availabilityPct(findings: FindingRow[], activeUnitIds: Set<number>, start: string, end: string, openUntil: string) {
  const { byUnit, hoursPerUnit } = downtimeByUnit(findings, start, end, openUntil)
  let downtime = 0
  for (const item of byUnit.values()) downtime += item.hours

  const units = new Set([...activeUnitIds, ...byUnit.keys()]).size
  const calendar = hoursPerUnit * units

  return { value: pct(calendar - downtime, calendar), units, hoursPerUnit, downtime }
}

/**
 * Downtime per unit in the window, used by PA and its drill-down. Each finding counts from the finding date to the
 * closure date (open → openUntil), clipped to the window; overlapping findings on one unit are merged.
 * `findings` keeps every finding with downtime in the window and its own clipped hours.
 */
export function downtimeByUnit(findings: FindingRow[], start: string, end: string, openUntil: string) {
  const startDay = dayNumber(start)
  const endDay = dayNumber(end) + 1
  const openEndDay = Math.min(endDay, dayNumber(openUntil) + 1)

  const spansByUnit = new Map<number, { spans: [number, number][]; findings: { row: FindingRow; hours: number }[] }>()
  for (const row of findings) {
    const from = Math.max(startDay, dayNumber(row.occurredIso))
    const to = Math.min(endDay, row.closureIso ? dayNumber(row.closureIso) : openEndDay)
    if (to <= from) continue
    const entry = spansByUnit.get(row.fleetUnitId) ?? { spans: [], findings: [] }
    entry.spans.push([from, to])
    entry.findings.push({ row, hours: (to - from) * 24 })
    spansByUnit.set(row.fleetUnitId, entry)
  }

  const byUnit = new Map<number, { hours: number; findings: { row: FindingRow; hours: number }[] }>()
  for (const [unitId, { spans, findings: unitFindings }] of spansByUnit) {
    spans.sort((a, b) => a[0] - b[0])
    let days = 0
    let [curFrom, curTo] = spans[0]
    for (const [from, to] of spans.slice(1)) {
      if (from <= curTo) {
        curTo = Math.max(curTo, to)
        continue
      }
      days += curTo - curFrom
      ;[curFrom, curTo] = [from, to]
    }
    days += curTo - curFrom
    byUnit.set(unitId, { hours: days * 24, findings: unitFindings })
  }

  return { byUnit, hoursPerUnit: (endDay - startDay) * 24 }
}

function issueLabel(row: FindingRow) {
  const parts = [row.componentName || row.componentCode, row.damageName || row.damageCode].filter(Boolean)
  if (parts.length) return parts.join(' — ')

  return row.description.length > 40 ? `${row.description.slice(0, 40)}…` : row.description
}

export type ControlQuery = {
  year: number
  month: number
  mode: ControlMode
  projectId?: string | null

  /** maintenance_types.id; narrows plan rows, findings, and targets to one program (spec section 5). */
  programId?: string | null
}

const userName = (user: { fullName: string | null; username: string } | null | undefined) => (user ? user.fullName || user.username : null)

/**
 * Loads every row the dashboard counts for one filter (site, period, MTD/YTD, program). Shared by the dashboard
 * numbers and the drill-down lists so both always use the same population.
 */
export async function loadControlData(session: Session, query: ControlQuery) {
  const { year, month, mode } = query
  const scope = resolveProjectFilter(session, query.projectId?.trim() || null)
  const projectWhere = scope.projectCode ? { projectId: scope.projectCode } : {}
  const programId = query.programId?.trim() || null

  const todayIso = dashboardTodayIso()
  const periodStart = mode === 'YTD' ? monthStartIso(year, 1) : monthStartIso(year, month)
  const periodEnd = monthEndIso(year, month)
  const cutoff = minIso(periodEnd, todayIso)

  const loadStart = monthStartIso(year - 1, 1)
  const userSelect = { select: { fullName: true, username: true } }

  const hmWhere = { deletedAt: null, ...(scope.projectCode ? { projectCode: scope.projectCode } : {}) }
  const planScope = scope.projectCode ? { maintenancePlan: projectWhere } : {}

  const [details, failures, activeUnits, hmRows, types, latest] = await Promise.all([
    prisma.maintenancePlanDetail.findMany({
      where: {
        planDate: { gte: isoToUtcDate(loadStart), lte: isoToUtcDate(periodEnd) },
        maintenancePlan: { ...projectWhere, ...(programId ? { maintenanceTypeId: programId } : {}) }
      },
      select: {
        id: true,
        fleetUnitId: true,
        planDate: true,
        pendingReason: true,
        pendingReasonUpdatedAt: true,
        pendingReasonUpdatedBy: userSelect,
        fleetUnit: { select: { unitNo: true } },
        maintenancePlan: {
          select: { projectId: true, maintenanceTypeId: true, maintenanceType: { select: { name: true } }, createdBy: userSelect }
        },
        actuals: {
          select: {
            id: true,
            registerNo: true,
            maintenanceDate: true,
            status: true,
            qcStatus: true,
            mechanics: true,
            remarks: true,
            pic: userSelect
          }
        }
      }
    }),
    prisma.maintenanceFailure.findMany({
      where: { ...projectWhere, occurredAt: { lte: new Date(isoToUtcDate(periodEnd).getTime() + DAY_MS) } },
      select: {
        id: true,
        projectId: true,
        fleetUnitId: true,
        severity: true,
        occurredAt: true,
        closureDate: true,
        componentCode: true,
        componentName: true,
        damageCode: true,
        damageName: true,
        description: true,
        fleetUnit: { select: { unitNo: true } },
        pic: userSelect,
        maintenanceActual: {
          select: {
            id: true,
            registerNo: true,
            maintenancePlan: { select: { maintenanceTypeId: true, maintenanceType: { select: { name: true } } } }
          }
        },
        _count: { select: { follows: true } }
      },
      orderBy: { occurredAt: 'asc' }
    }),
    prisma.fleetUnitCache.findMany({
      where: { unitStatus: 'ACTIVE', ...(scope.projectCode ? { projectCode: scope.projectCode } : {}) },
      select: { fleetUnitId: true, unitNo: true, projectCode: true }
    }),
    prisma.hm.findMany({
      where: {
        ...hmWhere,
        dateHm: {
          gte: new Date(isoToUtcDate(monthStartIso(year, 1)).getTime() - HM_LOOKBACK_DAYS * DAY_MS),
          lte: isoToUtcDate(periodEnd)
        }
      },
      select: { fleetUnitId: true, dateHm: true, hmUnit: true },
      orderBy: [{ dateHm: 'asc' }, { idHm: 'asc' }]
    }),
    prisma.maintenanceType.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),

    // Latest change to any source row in the site scope (spec section 15: data refresh timestamp).
    Promise.all([
      prisma.maintenancePlan.aggregate({ where: projectWhere, _max: { updatedAt: true } }),
      prisma.maintenancePlanDetail.aggregate({ where: planScope, _max: { createdAt: true, pendingReasonUpdatedAt: true } }),
      prisma.maintenanceActual.aggregate({ where: planScope, _max: { updatedAt: true } }),
      prisma.maintenanceFailure.aggregate({ where: projectWhere, _max: { updatedAt: true } }),
      prisma.hm.aggregate({ where: { ...hmWhere, dateHm: { gte: isoToUtcDate(loadStart) } }, _max: { updatedAt: true } })
    ]).then(results => results.flatMap(result => Object.values(result._max)).filter((date): date is Date => date instanceof Date))
  ])

  const plans: PlanRow[] = details.map(row => {
    const actual = row.actuals.find(item => item.status !== 'CANCELLED')

    return {
      detailId: row.id,
      fleetUnitId: row.fleetUnitId,
      unitNo: row.fleetUnit.unitNo,
      planIso: toIsoDateOnly(row.planDate) as string,
      projectId: row.maintenancePlan.projectId,
      typeId: row.maintenancePlan.maintenanceTypeId,
      typeName: row.maintenancePlan.maintenanceType.name,
      plannerName: userName(row.maintenancePlan.createdBy),
      pendingReason: row.pendingReason,
      pendingReasonUpdatedAt: row.pendingReasonUpdatedAt?.toISOString() ?? null,
      pendingReasonUpdatedBy: userName(row.pendingReasonUpdatedBy),
      actualId: actual?.id ?? null,
      registerNo: actual?.registerNo ?? null,
      actualIso: actual ? toIsoDateOnly(actual.maintenanceDate) : null,
      qcStatus: actual?.qcStatus ?? null,
      picName: userName(actual?.pic),
      mechanics: actual?.mechanics ?? null,
      remarks: actual?.remarks ?? null
    }
  })

  const allFindings: FindingRow[] = failures.map(row => ({
    id: row.id,
    fleetUnitId: row.fleetUnitId,
    unitNo: row.fleetUnit.unitNo,
    projectId: row.projectId,
    severity: row.severity,
    occurredIso: toIsoDateOnly(row.occurredAt) as string,
    closureIso: toIsoDateOnly(row.closureDate),
    componentCode: row.componentCode,
    componentName: row.componentName,
    damageCode: row.damageCode,
    damageName: row.damageName,
    description: row.description,
    typeId: row.maintenanceActual?.maintenancePlan.maintenanceTypeId ?? null,
    typeName: row.maintenanceActual?.maintenancePlan.maintenanceType.name ?? null,
    actualId: row.maintenanceActual?.id ?? null,
    registerNo: row.maintenanceActual?.registerNo ?? null,
    picName: userName(row.pic),
    repeatFinding: row._count.follows > 0
  }))

  /** Repeat failure: same unit, component and damage as an earlier finding from any program. */
  const seenCodes = new Set<string>()
  const repeatFailureIds = new Set<string>()
  for (const row of allFindings) {
    if (!row.componentCode || !row.damageCode) continue
    const key = `${row.fleetUnitId}|${row.componentCode}|${row.damageCode}`
    if (seenCodes.has(key)) repeatFailureIds.add(row.id)
    seenCodes.add(key)
  }

  const findings = programId ? allFindings.filter(row => row.typeId === programId) : allFindings
  const selectedProgram = programId ? types.find(type => type.id === programId) ?? null : null

  const activeUnitIds = new Set(activeUnits.map(row => row.fleetUnitId))

  /** Unit number and site for every unit the dashboard may list (active units have no plan row yet in some cases). */
  const unitInfo = new Map<number, { unitNo: string; site: string }>()
  for (const row of activeUnits) unitInfo.set(row.fleetUnitId, { unitNo: row.unitNo, site: row.projectCode })
  for (const row of [...plans, ...allFindings]) unitInfo.set(row.fleetUnitId, { unitNo: row.unitNo, site: row.projectId })

  const dataUpdatedAt = latest.length ? new Date(Math.max(...latest.map(date => date.getTime()))).toISOString() : null

  const hmByUnit = new Map<number, { iso: string; hm: number }[]>()
  for (const row of hmRows) {
    const list = hmByUnit.get(row.fleetUnitId) ?? []
    list.push({ iso: toIsoDateOnly(row.dateHm) as string, hm: Number(row.hmUnit) })
    hmByUnit.set(row.fleetUnitId, list)
  }

  return {
    year,
    month,
    mode,
    programId,
    selectedProgram,
    todayIso,
    periodStart,
    periodEnd,
    cutoff,
    types,
    plans,
    allFindings,
    findings,
    repeatFailureIds,
    activeUnitIds,
    unitInfo,
    hmByUnit,
    dataUpdatedAt,
    loadedAt: new Date().toISOString()
  }
}

export type ControlData = Awaited<ReturnType<typeof loadControlData>>

/** Dashboard payload. Pass `preloaded` when the caller already has the data (Excel export builds several views from one load). */
export async function getMaintenanceControl(session: Session, query: ControlQuery, preloaded?: ControlData) {
  const data = preloaded ?? (await loadControlData(session, query))
  const { year, month, mode, programId, selectedProgram, todayIso, periodStart, periodEnd, cutoff, types } = data
  const { plans, findings, repeatFailureIds, activeUnitIds, hmByUnit } = data

  // ---- Period numbers ----
  const exec = executionStats(plans, periodStart, periodEnd, cutoff)
  const backlog = backlogAt(plans, cutoff)
  const totalBacklog = backlog.b0_7 + backlog.b8_14 + backlog.b15_30 + backlog.gt30

  const periodFindings = findings.filter(row => between(row.occurredIso, periodStart, periodEnd))
  const closedFindings = periodFindings.filter(row => row.closureIso && row.closureIso <= cutoff)
  const repeatFindings = periodFindings.filter(row => row.repeatFinding)
  const repeatFailures = periodFindings.filter(row => repeatFailureIds.has(row.id))

  const openCritical = findings.filter(
    row => row.severity === 'CRITICAL' && row.occurredIso <= cutoff && (!row.closureIso || row.closureIso > cutoff)
  )
  const criticalAging = emptyBucket()
  for (const row of openCritical) addToBucket(criticalAging, dayNumber(cutoff) - dayNumber(row.occurredIso))

  /**
   * Critical Backlog (spec section 10): job overdue with severity Critical, not closed at the cut-off.
   * The job is the open critical finding; its due date is the finding date (agreed 2026-10-06), so it is overdue
   * from the next day. Aging = cut-off − due date.
   */
  const criticalBacklog = openCritical.filter(row => row.occurredIso < cutoff)

  const mttr = mttrHours(findings, periodStart, periodEnd)
  const runHours = operatingHours(hmByUnit, unitsIn(plans, findings, periodStart, periodEnd), periodStart, cutoff)
  const pa = availabilityPct(findings, activeUnitIds, periodStart, periodEnd, cutoff)

  // ---- Targets ----
  const periodEndDate = isoToUtcDate(periodEnd)

  const targetFor = async (code: KpiCode) =>
    resolveKpiTarget(code, { projectId: query.projectId || null, maintenanceTypeId: programId, periodEnd: periodEndDate })

  const kpi = async (
    code: string,
    label: string,
    unit: ControlKpi['unit'],
    value: number | null,
    options: { targetCode?: KpiCode; state?: KpiState; note?: string | null; detail?: string | null } = {}
  ): Promise<ControlKpi> => {
    const state: KpiState = options.state ?? (value == null ? 'no-data' : 'ready')
    const target = options.targetCode ? await targetFor(options.targetCode) : null

    return {
      code,
      label,
      value: state === 'ready' ? value : null,
      unit,
      target,
      color: state === 'ready' ? kpiStatusColor(value, target) : null,
      state,
      note: options.note ?? null,
      detail: options.detail ?? null
    }
  }

  const criticalBacklogAging = emptyBucket()
  for (const row of criticalBacklog) addToBucket(criticalBacklogAging, dayNumber(cutoff) - dayNumber(row.occurredIso))

  const noPlans = exec.plan === 0 ? 'No dated plan rows for this filter' : null
  const noDue = exec.due === 0 ? 'No plan rows due yet in this period' : null
  const noFindings = periodFindings.length === 0 ? 'No findings recorded in this period' : null
  const hasAnyPlans = plans.length > 0

  const kpiList = await Promise.all([
    kpi('PM_COMPLIANCE', 'PM Compliance', '%', pct(exec.executed, exec.plan), {
      targetCode: 'PM_COMPLIANCE',
      note: noPlans,
      detail: `${exec.executed} of ${exec.plan} plan rows done`
    }),
    kpi('ON_TIME_COMPLIANCE', 'On-Time Compliance', '%', pct(exec.onTime, exec.due), {
      targetCode: 'ON_TIME_COMPLIANCE',
      note: noDue,
      detail: `${exec.onTime} of ${exec.due} due rows done by plan date`
    }),
    kpi('SCHEDULE_ADHERENCE', 'Schedule Adherence', '%', pct(exec.onSchedule, exec.plan), {
      targetCode: 'SCHEDULE_ADHERENCE',
      note: noPlans,
      detail: `${exec.onSchedule} of ${exec.plan} done on plan date`
    }),
    kpi('OVERDUE_MAINTENANCE', 'Overdue Maintenance', '%', pct(exec.overdue, exec.due), {
      targetCode: 'OVERDUE_MAINTENANCE',
      note: noDue,
      detail: `${exec.overdue} of ${exec.due} due rows late or missing`
    }),
    kpi('TOTAL_BACKLOG', 'Total Backlog', 'count', hasAnyPlans ? totalBacklog : null, {
      note: hasAnyPlans ? null : 'No dated plan rows yet'
    }),
    kpi('BACKLOG_0_7', '0–7 Days', 'count', hasAnyPlans ? backlog.b0_7 : null),
    kpi('BACKLOG_8_14', '8–14 Days', 'count', hasAnyPlans ? backlog.b8_14 : null),
    kpi('BACKLOG_15_30', '15–30 Days', 'count', hasAnyPlans ? backlog.b15_30 : null),
    kpi('BACKLOG_GT30', 'Backlog > 30 Days', 'count', hasAnyPlans ? backlog.gt30 : null, {
      targetCode: 'BACKLOG_GT30',
      note: hasAnyPlans ? null : 'No dated plan rows yet'
    }),
    kpi('CRITICAL_BACKLOG', 'Critical Backlog', 'count', criticalBacklog.length, {
      targetCode: 'CRITICAL_BACKLOG',
      detail: 'Critical findings still open past their due date (due = finding date) at cut-off'
    }),
    kpi('QC_PASS_RATE', 'QC Pass Rate', '%', pct(exec.qcPass, exec.qcChecked), {
      targetCode: 'QC_PASS_RATE',
      note: exec.qcChecked === 0 ? 'No actual in this period has QC status Pass or Fail' : null,
      detail: `${exec.qcPass} of ${exec.qcChecked} checked passed`
    }),
    kpi('REPEAT_FINDING', 'Repeat Finding', '%', pct(repeatFindings.length, periodFindings.length), {
      targetCode: 'REPEAT_FINDING',
      note: noFindings,
      detail: `${repeatFindings.length} of ${periodFindings.length} findings seen again`
    }),
    kpi('FAILURE_CLOSURE', 'Finding Closure', '%', pct(closedFindings.length, periodFindings.length), {
      targetCode: 'FAILURE_CLOSURE',
      note: noFindings,
      detail: `${closedFindings.length} of ${periodFindings.length} findings closed`
    }),
    kpi('CRITICAL_FAILURE', 'Critical Finding', 'count', openCritical.length, {
      targetCode: 'CRITICAL_FAILURE',
      detail: 'Critical findings still open at cut-off'
    }),
    kpi('PA_AVAILABILITY', 'PA / Availability', '%', pa.value, {
      targetCode: 'PA_AVAILABILITY',
      note: pa.units === 0 ? 'No active units for this site' : null,
      detail: `${pa.units} units × ${pa.hoursPerUnit.toLocaleString()} h, downtime ${pa.downtime.toLocaleString()} h from ${
        selectedProgram ? `${selectedProgram.name} ` : ''
      }findings`
    }),
    kpi('MTBF', 'MTBF', 'hrs', periodFindings.length && runHours > 0 ? round1(runHours / periodFindings.length) : null, {
      targetCode: 'MTBF',
      note:
        runHours <= 0
          ? 'No hour meter increase recorded in this period'
          : periodFindings.length === 0
            ? 'No failures in this period'
            : null,
      detail: `${Math.round(runHours).toLocaleString('en-US')} operating hrs (units planned or with findings) ÷ ${periodFindings.length} failures`
    }),
    kpi('MTTR', 'MTTR', 'hrs', mttr.value, {
      targetCode: 'MTTR',
      note: mttr.count === 0 ? 'No finding closed in this period' : null,
      detail: `${mttr.count} closed findings`
    }),
    kpi('REPEAT_FAILURE', 'Repeat Failure Rate', '%', pct(repeatFailures.length, periodFindings.length), {
      targetCode: 'REPEAT_FAILURE',
      note: noFindings,
      detail: 'Same unit, component and damage as an earlier finding'
    }),
    kpi('FAILURE_FREQUENCY', 'Failure Frequency', 'count', periodFindings.length, {
      detail: 'Findings recorded in this period'
    })
  ])

  const kpis = Object.fromEntries(kpiList.map(item => [item.code, item])) as Record<string, ControlKpi>

  // ---- Monthly trend (Jan → selected month) ----
  const trend = []
  for (let m = 1; m <= month; m += 1) {
    const start = monthStartIso(year, m)
    const end = monthEndIso(year, m)
    const label = MONTHS_SHORT[m - 1]
    if (start > todayIso) {
      trend.push({ month: m, label, pmCompliance: null, onTime: null, qcPass: null, pa: null, mtbf: null, mttr: null })
      continue
    }
    const monthCutoff = minIso(end, todayIso)
    const stats = executionStats(plans, start, end, monthCutoff)
    const monthFindings = findings.filter(row => between(row.occurredIso, start, end)).length
    const monthRun = operatingHours(hmByUnit, unitsIn(plans, findings, start, end), start, monthCutoff)
    trend.push({
      month: m,
      label,
      pmCompliance: pct(stats.executed, stats.plan),
      onTime: pct(stats.onTime, stats.due),
      qcPass: pct(stats.qcPass, stats.qcChecked),
      pa: availabilityPct(findings, activeUnitIds, start, end, monthCutoff).value,
      mtbf: monthFindings && monthRun > 0 ? round1(monthRun / monthFindings) : null,
      mttr: mttrHours(findings, start, end).value
    })
  }

  // ---- Backlog aging, last months ending at the selected month ----
  const backlogTrend = []
  for (let offset = BACKLOG_TREND_MONTHS - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1))
    const y = date.getUTCFullYear()
    const m = date.getUTCMonth() + 1
    if (monthStartIso(y, m) > todayIso) continue
    const bucket = backlogAt(plans, minIso(monthEndIso(y, m), todayIso))
    backlogTrend.push({ label: MONTHS_SHORT[m - 1], ...bucket, total: bucket.b0_7 + bucket.b8_14 + bucket.b15_30 + bucket.gt30 })
  }

  // ---- Per program ----
  const programs = types
    .filter(type => !programId || type.id === programId)
    .map(type => {
      const rows = plans.filter(row => row.typeId === type.id)
      const stats = executionStats(rows, periodStart, periodEnd, cutoff)
      const typeFindings = periodFindings.filter(row => row.typeId === type.id)
      const closed = typeFindings.filter(row => row.closureIso && row.closureIso <= cutoff).length

      return {
        typeId: type.id,
        name: type.name,
        plan: stats.plan,
        actual: stats.executed,
        achievement: pct(stats.executed, stats.plan),
        due: stats.due,
        onTime: stats.onTime,
        onTimeRate: pct(stats.onTime, stats.due),
        overdue: stats.overdue,
        findings: typeFindings.length,
        closed,
        closureRate: pct(closed, typeFindings.length),
        repeatRate: pct(typeFindings.filter(row => row.repeatFinding).length, typeFindings.length)
      }
    })
    .filter(row => row.plan > 0 || row.findings > 0)

  // ---- Top issues vs the previous window (previous month for MTD, same months last year for YTD) ----
  const previousStart = mode === 'YTD' ? monthStartIso(year - 1, 1) : monthStartIso(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)
  const previousEnd = mode === 'YTD' ? monthEndIso(year - 1, month) : monthEndIso(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)
  const issueCounts = new Map<string, { current: number; previous: number }>()
  for (const row of findings) {
    const inCurrent = between(row.occurredIso, periodStart, periodEnd)
    const inPrevious = between(row.occurredIso, previousStart, previousEnd)
    if (!inCurrent && !inPrevious) continue
    const label = issueLabel(row)
    const entry = issueCounts.get(label) ?? { current: 0, previous: 0 }
    if (inCurrent) entry.current += 1
    if (inPrevious) entry.previous += 1
    issueCounts.set(label, entry)
  }

  const topIssues = [...issueCounts.entries()]
    .filter(([, counts]) => counts.current > 0)
    .sort((a, b) => b[1].current - a[1].current)
    .slice(0, 10)
    .map(([label, counts]) => ({
      label,
      frequency: counts.current,
      previous: counts.previous,
      trend: counts.current > counts.previous ? 'up' : counts.current < counts.previous ? 'down' : 'flat'
    }))

  const periodLabel = `${MONTHS_SHORT[month - 1]} ${year}`

  return {
    period: {
      year,
      month,
      mode,
      start: periodStart,
      end: periodEnd,
      cutoff,
      label: periodLabel,
      ytdLabel: `Jan – ${periodLabel}`,
      projectId: query.projectId || null,
      programId: selectedProgram?.id ?? null,
      programName: selectedProgram?.name ?? null,
      dataUpdatedAt: data.dataUpdatedAt,
      loadedAt: data.loadedAt
    },
    programOptions: types.map(type => ({ id: type.id, name: type.name })),
    kpis,
    trend,
    backlogTrend,
    criticalAging,
    criticalBacklogAging,
    programs,
    overallAchievement: pct(exec.executed, exec.plan),
    topIssues
  }
}
