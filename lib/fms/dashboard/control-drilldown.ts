/**
 * Drill-down lists for the Fundamental Maintenance Control dashboard (spec section 13).
 * Each list is built from loadControlData() with the same filter as the dashboard, so its totals reconcile with
 * the KPI that opened it. WO = maintenance_actuals (register no links to /maintenance-actuals/view/[id]).
 *
 * Response: { title, subtitle, summary[], columns[], rows[] }. Column `type` tells the UI how to render a cell:
 * text | date | number | wo | chip | reason | list.
 */
import type { Session } from 'next-auth'

import {
  between,
  type ControlData,
  type ControlQuery,
  dayNumber,
  downtimeByUnit,
  type FindingRow,
  loadControlData,
  operatingHours,
  pct,
  type PlanRow,
  round1,
  unitsIn
} from './control'

export const DRILLDOWN_KINDS = ['pm', 'backlog', 'qc', 'findings', 'repeat-failure', 'reliability', 'availability', 'program'] as const

export type DrilldownKind = (typeof DRILLDOWN_KINDS)[number]

/** Optional narrowing passed by the card or chart that opened the list. */
export type DrilldownOptions = {
  bucket?: string | null
  qc?: string | null
  severity?: string | null
  open?: boolean
  overdue?: boolean
  repeat?: boolean
}

type ColumnType = 'text' | 'date' | 'number' | 'wo' | 'chip' | 'reason' | 'list'
type Column = { key: string; label: string; type?: ColumnType; align?: 'left' | 'right' | 'center' }
type Chip = { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'primary' }
type Row = Record<string, unknown> & { id: string }

const wo = (id: string | null, no: string | null) => (id ? { id, no } : null)

/** Aging buckets from spec section 10, keyed like the dashboard buckets. */
const BUCKETS: Record<string, { label: string; test: (age: number) => boolean }> = {
  b0_7: { label: '0–7 days', test: age => age <= 7 },
  b8_14: { label: '8–14 days', test: age => age >= 8 && age <= 14 },
  b15_30: { label: '15–30 days', test: age => age >= 15 && age <= 30 },
  gt30: { label: '> 30 days', test: age => age > 30 }
}

const bucketOf = (age: number) => Object.entries(BUCKETS).find(([, bucket]) => bucket.test(age))?.[0] ?? 'gt30'

const issueText = (row: FindingRow) =>
  [row.componentName || row.componentCode, row.damageName || row.damageCode].filter(Boolean).join(' — ') || row.description

const SEVERITY_CHIP: Record<string, Chip> = {
  CRITICAL: { label: 'Critical', color: 'error' },
  MAJOR: { label: 'Major', color: 'warning' },
  MINOR: { label: 'Minor', color: 'info' }
}

/** PM Compliance / On-Time: every plan row in the period with its WO and result. */
function pmList(data: ControlData) {
  const { periodStart, periodEnd, cutoff } = data
  const rows = data.plans.filter(row => between(row.planIso, periodStart, periodEnd))

  const result = (row: PlanRow): Chip => {
    if (row.actualIso) return row.actualIso <= row.planIso ? { label: 'On time', color: 'success' } : { label: 'Late', color: 'warning' }
    if (row.planIso < cutoff) return { label: 'Overdue', color: 'error' }
    if (row.planIso === cutoff) return { label: 'Due today', color: 'warning' }

    return { label: 'Not due yet', color: 'secondary' }
  }

  const due = rows.filter(row => row.planIso <= cutoff)
  const done = rows.filter(row => row.actualIso)
  const onTime = due.filter(row => row.actualIso && row.actualIso <= row.planIso)
  const overdue = due.filter(row => (row.actualIso ? row.actualIso > row.planIso : row.planIso < cutoff))

  return {
    title: 'PM Compliance — plan vs actual',
    subtitle: 'Every dated plan row in the period. Due = plan date on or before the cut-off.',
    summary: [
      { label: 'Plan', value: rows.length },
      { label: 'Actual', value: done.length },
      { label: 'PM Compliance', value: pct(done.length, rows.length), unit: '%' },
      { label: 'Due', value: due.length },
      { label: 'On time', value: onTime.length },
      { label: 'On-Time', value: pct(onTime.length, due.length), unit: '%' },
      { label: 'Late / overdue', value: overdue.length }
    ],
    columns: [
      { key: 'planDate', label: 'Plan date', type: 'date' },
      { key: 'unit', label: 'Unit' },
      { key: 'site', label: 'Site' },
      { key: 'program', label: 'Program' },
      { key: 'wo', label: 'Reg. No', type: 'wo' },
      { key: 'actualDate', label: 'Actual date', type: 'date' },
      { key: 'result', label: 'Result', type: 'chip' },
      { key: 'daysLate', label: 'Days late', type: 'number', align: 'right' },
      { key: 'pic', label: 'PIC' }
    ] as Column[],
    rows: rows
      .sort((a, b) => b.planIso.localeCompare(a.planIso) || a.unitNo.localeCompare(b.unitNo))
      .map(row => {
        const lateUntil = row.actualIso ?? (row.planIso < cutoff ? cutoff : null)
        const daysLate = lateUntil && lateUntil > row.planIso ? dayNumber(lateUntil) - dayNumber(row.planIso) : null

        return {
          id: row.detailId,
          planDate: row.planIso,
          unit: row.unitNo,
          site: row.projectId,
          program: row.typeName,
          wo: wo(row.actualId, row.registerNo),
          actualDate: row.actualIso,
          result: result(row),
          daysLate,
          pic: row.picName
        }
      })
  }
}

/** Backlog: plan rows still open at the cut-off, aged from the plan (due) date, with the pending reason. */
function backlogList(data: ControlData, options: DrilldownOptions) {
  const { cutoff } = data
  const bucket = options.bucket && BUCKETS[options.bucket] ? options.bucket : null

  const open = data.plans
    .filter(row => row.planIso <= cutoff && !(row.actualIso && row.actualIso <= cutoff))
    .map(row => ({ row, age: dayNumber(cutoff) - dayNumber(row.planIso) }))
  const counts = Object.fromEntries(Object.keys(BUCKETS).map(key => [key, 0]))
  for (const item of open) counts[bucketOf(item.age)] += 1
  const rows = bucket ? open.filter(item => bucketOf(item.age) === bucket) : open

  return {
    title: bucket ? `Backlog ${BUCKETS[bucket].label}` : 'Backlog — open plan rows',
    subtitle: 'Plan rows not done by the cut-off. Aging = cut-off − plan (due) date. Add a reason for each pending job.',
    summary: [
      { label: 'Open', value: open.length },
      ...Object.entries(BUCKETS).map(([key, item]) => ({ label: item.label, value: counts[key] }))
    ],
    columns: [
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'unit', label: 'Unit' },
      { key: 'site', label: 'Site' },
      { key: 'program', label: 'Program' },
      { key: 'aging', label: 'Aging (days)', type: 'number', align: 'right' },
      { key: 'reason', label: 'Reason', type: 'reason' },
      { key: 'planner', label: 'Planner' },
      { key: 'doneLater', label: 'Done after cut-off', type: 'wo' }
    ] as Column[],
    rows: rows
      .sort((a, b) => b.age - a.age)
      .map(({ row, age }) => ({
        id: row.detailId,
        dueDate: row.planIso,
        unit: row.unitNo,
        site: row.projectId,
        program: row.typeName,
        aging: age,
        reason: {
          detailId: row.detailId,
          text: row.pendingReason,
          updatedAt: row.pendingReasonUpdatedAt,
          updatedBy: row.pendingReasonUpdatedBy
        },
        planner: row.plannerName,
        doneLater: row.actualIso ? { ...wo(row.actualId, row.registerNo), note: row.actualIso } : null
      }))
  }
}

/** QC Pass Rate: WOs in the period with QC Pass/Fail and their maintenance detail. */
function qcList(data: ControlData, options: DrilldownOptions) {
  const { periodStart, periodEnd } = data
  const executed = data.plans.filter(row => between(row.planIso, periodStart, periodEnd) && row.actualIso)
  const checked = executed.filter(row => row.qcStatus === 'PASS' || row.qcStatus === 'FAIL')
  const passed = checked.filter(row => row.qcStatus === 'PASS')
  const onlyFail = options.qc === 'FAIL'

  const findingsByActual = new Map<string, number>()
  for (const finding of data.allFindings) {
    if (finding.actualId) findingsByActual.set(finding.actualId, (findingsByActual.get(finding.actualId) ?? 0) + 1)
  }

  return {
    title: onlyFail ? 'QC Fail — work orders' : 'QC Pass Rate — work orders',
    subtitle: 'Actuals with QC Pass or Fail in the period. Open the Reg. No for the full maintenance detail.',
    summary: [
      { label: 'Checked', value: checked.length },
      { label: 'Pass', value: passed.length },
      { label: 'Fail', value: checked.length - passed.length },
      { label: 'QC Pass Rate', value: pct(passed.length, checked.length), unit: '%' },
      { label: 'Not checked', value: executed.length - checked.length }
    ],
    columns: [
      { key: 'wo', label: 'Reg. No', type: 'wo' },
      { key: 'actualDate', label: 'Actual date', type: 'date' },
      { key: 'unit', label: 'Unit' },
      { key: 'site', label: 'Site' },
      { key: 'program', label: 'Program' },
      { key: 'qc', label: 'QC', type: 'chip' },
      { key: 'pic', label: 'PIC' },
      { key: 'mechanics', label: 'Mechanics' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'findings', label: 'Findings', type: 'number', align: 'right' }
    ] as Column[],
    rows: (onlyFail ? checked.filter(row => row.qcStatus === 'FAIL') : checked)
      .sort((a, b) => (b.actualIso ?? '').localeCompare(a.actualIso ?? ''))
      .map(row => ({
        id: row.detailId,
        wo: wo(row.actualId, row.registerNo),
        actualDate: row.actualIso,
        unit: row.unitNo,
        site: row.projectId,
        program: row.typeName,
        qc: row.qcStatus === 'PASS' ? { label: 'Pass', color: 'success' } : { label: 'Fail', color: 'error' },
        pic: row.picName,
        mechanics: row.mechanics,
        remarks: row.remarks,
        findings: row.actualId ? findingsByActual.get(row.actualId) ?? 0 : 0
      }))
  }
}

/**
 * Findings. Default: findings recorded in the period (Finding Closure). With `open`, findings still open at the
 * cut-off from any date (Critical Finding); `overdue` also requires finding date < cut-off (Critical Backlog).
 */
function findingList(data: ControlData, options: DrilldownOptions) {
  const { periodStart, periodEnd, cutoff } = data
  const severity = options.severity && SEVERITY_CHIP[options.severity] ? options.severity : null

  let rows = options.open
    ? data.findings.filter(row => row.occurredIso <= cutoff && (!row.closureIso || row.closureIso > cutoff))
    : data.findings.filter(row => between(row.occurredIso, periodStart, periodEnd))
  if (options.overdue) rows = rows.filter(row => row.occurredIso < cutoff)
  if (severity) rows = rows.filter(row => row.severity === severity)
  if (options.repeat) rows = rows.filter(row => row.repeatFinding)

  const isClosed = (row: FindingRow) => Boolean(row.closureIso && row.closureIso <= cutoff)
  const closed = rows.filter(isClosed).length
  const severityLabel = severity ? `${SEVERITY_CHIP[severity].label} ` : ''

  const title = options.overdue
    ? `${severityLabel}Backlog — overdue findings`
    : options.open
      ? `Open ${severityLabel}findings at cut-off`
      : options.repeat
        ? 'Repeat findings'
        : `${severityLabel}Findings — open and closed`

  return {
    title,
    subtitle: options.open
      ? 'Still open at the cut-off. Due date = finding date; aging = cut-off − finding date.'
      : 'Findings recorded in the period. Aging = closure (or cut-off if open) − finding date.',
    summary: [
      { label: 'Findings', value: rows.length },
      { label: 'Closed', value: closed },
      { label: 'Open', value: rows.length - closed },
      { label: 'Closure', value: pct(closed, rows.length), unit: '%' }
    ],
    columns: [
      { key: 'findingDate', label: 'Finding date', type: 'date' },
      { key: 'unit', label: 'Unit' },
      { key: 'site', label: 'Site' },
      { key: 'program', label: 'Program' },
      { key: 'severity', label: 'Severity', type: 'chip' },
      { key: 'issue', label: 'Issue' },
      { key: 'wo', label: 'Reg. No', type: 'wo' },
      { key: 'closureDate', label: 'Closure date', type: 'date' },
      { key: 'status', label: 'Status', type: 'chip' },
      { key: 'aging', label: 'Aging (days)', type: 'number', align: 'right' },
      { key: 'pic', label: 'PIC' }
    ] as Column[],
    rows: rows
      .sort((a, b) => b.occurredIso.localeCompare(a.occurredIso))
      .map(row => {
        const closedRow = isClosed(row)
        const end = closedRow ? (row.closureIso as string) : cutoff

        return {
          id: row.id,
          findingDate: row.occurredIso,
          unit: row.unitNo,
          site: row.projectId,
          program: row.typeName,
          severity: SEVERITY_CHIP[row.severity] ?? { label: row.severity, color: 'secondary' },
          issue: issueText(row),
          wo: wo(row.actualId, row.registerNo),
          closureDate: closedRow ? row.closureIso : null,
          status: closedRow ? { label: 'Closed', color: 'success' } : { label: 'Open', color: 'error' },
          aging: Math.max(0, dayNumber(end) - dayNumber(row.occurredIso)),
          pic: row.picName
        }
      })
  }
}

/** Repeat failure: unit + failure code (component + damage) with every occurrence in history. */
function repeatFailureList(data: ControlData) {
  const { periodStart, periodEnd } = data
  const periodFindings = data.findings.filter(row => between(row.occurredIso, periodStart, periodEnd))
  const repeats = periodFindings.filter(row => data.repeatFailureIds.has(row.id))

  const keyOf = (row: FindingRow) => `${row.fleetUnitId}|${row.componentCode}|${row.damageCode}`
  const groups = new Map<string, FindingRow[]>()
  for (const row of repeats) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row])

  return {
    title: 'Repeat Failure — unit and failure code',
    subtitle: 'Same unit, component, and damage as an earlier finding (any program). History lists every occurrence up to the period end.',
    summary: [
      { label: 'Failures', value: periodFindings.length },
      { label: 'Repeat failures', value: repeats.length },
      { label: 'Repeat Failure Rate', value: pct(repeats.length, periodFindings.length), unit: '%' },
      { label: 'Unit / code pairs', value: groups.size }
    ],
    columns: [
      { key: 'unit', label: 'Unit' },
      { key: 'site', label: 'Site' },
      { key: 'failureCode', label: 'Failure code' },
      { key: 'issue', label: 'Component — damage' },
      { key: 'repeats', label: 'Repeats in period', type: 'number', align: 'right' },
      { key: 'occurrences', label: 'All occurrences', type: 'number', align: 'right' },
      { key: 'history', label: 'History', type: 'list' }
    ] as Column[],
    rows: [...groups.entries()]
      .map(([key, rows]) => {
        const first = rows[0]
        const history = data.allFindings.filter(row => keyOf(row) === key && row.occurredIso <= periodEnd)

        return {
          id: key,
          unit: first.unitNo,
          site: first.projectId,
          failureCode: `${first.componentCode} / ${first.damageCode}`,
          issue: issueText(first),
          repeats: rows.length,
          occurrences: history.length,
          history: history.map(row => `${row.occurredIso}${row.registerNo ? ` · ${row.registerNo}` : ''}${row.closureIso ? '' : ' · open'}`)
        }
      })
      .sort((a, b) => b.occurrences - a.occurrences)
  }
}

/** MTBF / MTTR per unit: operating hours, failure events, repair events and hours. */
function reliabilityList(data: ControlData) {
  const { periodStart, periodEnd, cutoff } = data
  const unitIds = unitsIn(data.plans, data.findings, periodStart, periodEnd)
  const unitInfo = new Map<number, { unitNo: string; site: string }>()
  for (const row of [...data.plans, ...data.findings]) unitInfo.set(row.fleetUnitId, { unitNo: row.unitNo, site: row.projectId })

  const failures = data.findings.filter(row => between(row.occurredIso, periodStart, periodEnd))
  const repairs = data.findings.filter(row => row.closureIso && between(row.closureIso, periodStart, periodEnd))
  const repairHours = (row: FindingRow) => (dayNumber(row.closureIso as string) - dayNumber(row.occurredIso)) * 24

  const rows = [...unitIds].map(unitId => {
    const run = operatingHours(data.hmByUnit, new Set([unitId]), periodStart, cutoff)
    const unitFailures = failures.filter(row => row.fleetUnitId === unitId).length
    const unitRepairs = repairs.filter(row => row.fleetUnitId === unitId)
    const hours = unitRepairs.reduce((sum, row) => sum + repairHours(row), 0)

    return {
      id: String(unitId),
      unit: unitInfo.get(unitId)?.unitNo ?? String(unitId),
      site: unitInfo.get(unitId)?.site ?? null,
      operatingHours: Math.round(run),
      failures: unitFailures,
      mtbf: unitFailures && run > 0 ? round1(run / unitFailures) : null,
      repairs: unitRepairs.length,
      repairHours: hours,
      mttr: unitRepairs.length ? round1(hours / unitRepairs.length) : null
    }
  })

  const totalRun = operatingHours(data.hmByUnit, unitIds, periodStart, cutoff)
  const totalRepairHours = repairs.reduce((sum, row) => sum + repairHours(row), 0)

  return {
    title: 'MTBF / MTTR — by unit',
    subtitle: 'Units with plan rows or findings in the period. Repair time = finding date → closure date, for findings closed in the period.',
    summary: [
      { label: 'Operating hrs', value: Math.round(totalRun) },
      { label: 'Failures', value: failures.length },
      { label: 'MTBF', value: failures.length && totalRun > 0 ? round1(totalRun / failures.length) : null, unit: 'hrs' },
      { label: 'Repairs closed', value: repairs.length },
      { label: 'MTTR', value: repairs.length ? round1(totalRepairHours / repairs.length) : null, unit: 'hrs' }
    ],
    columns: [
      { key: 'unit', label: 'Unit' },
      { key: 'site', label: 'Site' },
      { key: 'operatingHours', label: 'Operating hrs', type: 'number', align: 'right' },
      { key: 'failures', label: 'Failures', type: 'number', align: 'right' },
      { key: 'mtbf', label: 'MTBF (hrs)', type: 'number', align: 'right' },
      { key: 'repairs', label: 'Repairs closed', type: 'number', align: 'right' },
      { key: 'repairHours', label: 'Repair hrs', type: 'number', align: 'right' },
      { key: 'mttr', label: 'MTTR (hrs)', type: 'number', align: 'right' }
    ] as Column[],
    rows: rows
      .filter(row => row.operatingHours > 0 || row.failures > 0 || row.repairs > 0)
      .sort((a, b) => b.failures - a.failures || b.repairs - a.repairs || a.unit.localeCompare(b.unit))
  }
}

/** PA per unit: calendar hours, finding downtime (merged per unit, same rule as the KPI), and the findings behind it. */
function availabilityList(data: ControlData) {
  const { periodStart, periodEnd, cutoff } = data
  const { byUnit, hoursPerUnit } = downtimeByUnit(data.findings, periodStart, periodEnd, cutoff)
  const unitIds = new Set([...data.activeUnitIds, ...byUnit.keys()])

  const rows = [...unitIds].map(unitId => {
    const down = byUnit.get(unitId)
    const downtime = down?.hours ?? 0

    return {
      id: String(unitId),
      unit: data.unitInfo.get(unitId)?.unitNo ?? String(unitId),
      site: data.unitInfo.get(unitId)?.site ?? null,
      status: data.activeUnitIds.has(unitId) ? { label: 'Active', color: 'success' } : { label: 'Not active', color: 'secondary' },
      calendarHours: hoursPerUnit,
      downtimeHours: downtime,
      pa: pct(hoursPerUnit - downtime, hoursPerUnit),
      findings: down?.findings.length ?? 0,
      history: (down?.findings ?? []).map(
        ({ row, hours }) =>
          `${row.occurredIso} → ${row.closureIso ?? 'open'} · ${hours} h${row.registerNo ? ` · ${row.registerNo}` : ''} · ${issueText(row)}`
      )
    }
  })
  const totalDowntime = rows.reduce((sum, row) => sum + row.downtimeHours, 0)
  const calendar = hoursPerUnit * rows.length

  return {
    title: 'PA / Availability — by unit',
    subtitle:
      'Active units in scope plus units with downtime. Downtime = finding date → closure date (open findings up to the cut-off), overlaps merged per unit.',
    summary: [
      { label: 'Units', value: rows.length },
      { label: 'Calendar hrs', value: calendar },
      { label: 'Downtime hrs', value: totalDowntime },
      { label: 'PA', value: pct(calendar - totalDowntime, calendar), unit: '%' },
      { label: 'Units with downtime', value: byUnit.size }
    ],
    columns: [
      { key: 'unit', label: 'Unit' },
      { key: 'site', label: 'Site' },
      { key: 'status', label: 'Unit status', type: 'chip' },
      { key: 'calendarHours', label: 'Calendar hrs', type: 'number', align: 'right' },
      { key: 'downtimeHours', label: 'Downtime hrs', type: 'number', align: 'right' },
      { key: 'pa', label: 'PA %', type: 'number', align: 'right' },
      { key: 'findings', label: 'Findings', type: 'number', align: 'right' },
      { key: 'history', label: 'Downtime findings', type: 'list' }
    ] as Column[],
    rows: rows.sort((a, b) => b.downtimeHours - a.downtimeHours || a.unit.localeCompare(b.unit))
  }
}

/** Program Achievement: plan vs actual per program and site. */
function programList(data: ControlData) {
  const { periodStart, periodEnd, cutoff } = data
  const inPeriod = data.plans.filter(row => between(row.planIso, periodStart, periodEnd))
  const findings = data.findings.filter(row => between(row.occurredIso, periodStart, periodEnd))

  const groups = new Map<string, PlanRow[]>()
  for (const row of inPeriod) {
    const key = `${row.typeId}|${row.projectId}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  const rows = [...groups.entries()].map(([key, rows]) => {
    const [typeId, site] = key.split('|')
    const due = rows.filter(row => row.planIso <= cutoff)
    const actual = rows.filter(row => row.actualIso).length
    const onTime = due.filter(row => row.actualIso && row.actualIso <= row.planIso).length

    return {
      id: key,
      program: rows[0].typeName,
      site,
      plan: rows.length,
      actual,
      achievement: pct(actual, rows.length),
      due: due.length,
      onTime,
      onTimeRate: pct(onTime, due.length),
      overdue: due.filter(row => (row.actualIso ? row.actualIso > row.planIso : row.planIso < cutoff)).length,
      findings: findings.filter(row => row.typeId === typeId && row.projectId === site).length
    }
  })
  const totalActual = inPeriod.filter(row => row.actualIso).length

  return {
    title: 'Program Achievement — plan vs actual by site',
    subtitle: 'Achievement = actual ÷ plan rows; on-time counted against rows already due.',
    summary: [
      { label: 'Plan', value: inPeriod.length },
      { label: 'Actual', value: totalActual },
      { label: 'Achievement', value: pct(totalActual, inPeriod.length), unit: '%' },
      { label: 'Program / site rows', value: rows.length }
    ],
    columns: [
      { key: 'program', label: 'Program' },
      { key: 'site', label: 'Site' },
      { key: 'plan', label: 'Plan', type: 'number', align: 'right' },
      { key: 'actual', label: 'Actual', type: 'number', align: 'right' },
      { key: 'achievement', label: 'Achv. %', type: 'number', align: 'right' },
      { key: 'due', label: 'Due', type: 'number', align: 'right' },
      { key: 'onTime', label: 'On-time', type: 'number', align: 'right' },
      { key: 'onTimeRate', label: 'On-time %', type: 'number', align: 'right' },
      { key: 'overdue', label: 'Overdue', type: 'number', align: 'right' },
      { key: 'findings', label: 'Findings', type: 'number', align: 'right' }
    ] as Column[],
    rows: rows.sort((a, b) => a.program.localeCompare(b.program) || a.site.localeCompare(b.site))
  }
}

export type DrilldownColumn = Column

export type DrilldownList = ReturnType<typeof buildDrilldown>

/** One drill-down list from data already loaded (shared by the API and the Excel export). */
export function buildDrilldown(data: ControlData, kind: DrilldownKind, options: DrilldownOptions = {}) {
  const list =
    kind === 'pm'
      ? pmList(data)
      : kind === 'backlog'
        ? backlogList(data, options)
        : kind === 'qc'
          ? qcList(data, options)
          : kind === 'findings'
            ? findingList(data, options)
            : kind === 'repeat-failure'
              ? repeatFailureList(data)
              : kind === 'reliability'
                ? reliabilityList(data)
                : kind === 'availability'
                  ? availabilityList(data)
                  : programList(data)

  return {
    kind,
    ...list,
    rows: list.rows as Row[],
    period: { start: data.periodStart, end: data.periodEnd, cutoff: data.cutoff, mode: data.mode, programName: data.selectedProgram?.name ?? null }
  }
}

/** Build one drill-down list for the dashboard filter. */
export async function getControlDrilldown(session: Session, query: ControlQuery, kind: DrilldownKind, options: DrilldownOptions = {}) {
  return buildDrilldown(await loadControlData(session, query), kind, options)
}
