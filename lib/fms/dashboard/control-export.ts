/**
 * Excel export of the Fundamental Maintenance Control dashboard (spec section 14: "Excel – detail transaksi dan KPI").
 * One data load for the dashboard filter feeds every sheet, so the workbook shows the same numbers as the screen:
 *   Summary (filter + KPI with target/status + program table), Monthly Trend, and one sheet per drill-down list.
 * Reg. No cells link to the maintenance actual in the app.
 */
import ExcelJS from 'exceljs'
import type { Session } from 'next-auth'

import { getAppBaseUrl } from '@/lib/notifications/mailer'

import { type ControlKpi, type ControlQuery, getMaintenanceControl, loadControlData } from './control'
import { buildDrilldown, type DrilldownKind, type DrilldownList, type DrilldownOptions } from './control-drilldown'

/** KPI groups in the order of the dashboard tables. */
const CATEGORIES = [
  { title: 'Execution Control', codes: ['PM_COMPLIANCE', 'ON_TIME_COMPLIANCE', 'SCHEDULE_ADHERENCE', 'OVERDUE_MAINTENANCE'] },
  {
    title: 'Backlog Control',
    codes: ['TOTAL_BACKLOG', 'BACKLOG_0_7', 'BACKLOG_8_14', 'BACKLOG_15_30', 'BACKLOG_GT30', 'CRITICAL_BACKLOG']
  },
  { title: 'Quality Control', codes: ['QC_PASS_RATE', 'REPEAT_FINDING', 'FAILURE_CLOSURE', 'CRITICAL_FAILURE'] },
  { title: 'Reliability / Effectiveness', codes: ['PA_AVAILABILITY', 'MTBF', 'MTTR', 'REPEAT_FAILURE', 'FAILURE_FREQUENCY'] }
]

/** Detail sheets: sheet name (max 31 chars) → drill-down list. */
const DETAIL_SHEETS: { name: string; kind: DrilldownKind; options?: DrilldownOptions }[] = [
  { name: 'PM Plan vs Actual', kind: 'pm' },
  { name: 'Backlog', kind: 'backlog' },
  { name: 'QC', kind: 'qc' },
  { name: 'Findings', kind: 'findings' },
  { name: 'Open Critical Findings', kind: 'findings', options: { severity: 'CRITICAL', open: true } },
  { name: 'Repeat Failure', kind: 'repeat-failure' },
  { name: 'MTBF MTTR by Unit', kind: 'reliability' },
  { name: 'PA by Unit', kind: 'availability' },
  { name: 'Program by Site', kind: 'program' }
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Status text and fill (ARGB) per target colour, as on the dashboard. */
const STATUS = {
  green: { label: 'Target met', fill: 'FFD8F3DC' },
  yellow: { label: 'Near target', fill: 'FFFFF3CD' },
  red: { label: 'Target not met', fill: 'FFF8D7DA' }
} as const

/** Summary sheet column widths: KPI table (7 columns) and the wider program table below it. */
const SUMMARY_WIDTHS = [28, 26, 12, 9, 12, 16, 60, 12, 12, 12, 12, 12]

const HEADER_FILL = 'FF1F3864'
const DATE_FORMAT = 'dd mmm yyyy'

const isoToDate = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`) : null)

/** "7 Oct 2026, 11:45 (Asia/Makassar)" in the user's time zone; falls back to UTC for an unknown zone. */
function formatDateTime(iso: string | null, timeZone: string) {
  if (!iso) return '-'

  const format = (zone: string) =>
    `${new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: zone })} (${zone})`
  try {
    return format(timeZone)
  } catch {
    return format('UTC')
  }
}

const formatTarget = (kpi: ControlKpi) => {
  if (!kpi.target) return '-'
  const suffix = kpi.unit === '%' ? '%' : kpi.unit === 'hrs' ? ' hrs' : ''
  const value = `${kpi.target.targetValue}${suffix}`
  if (kpi.target.direction === 'HIGHER') return `≥${value}`
  if (kpi.target.direction === 'LOWER') return `≤${value}`

  return value
}

const statusOf = (kpi: ControlKpi) => {
  if (kpi.state === 'not-built') return { label: 'Not built yet', fill: null }
  if (kpi.state === 'no-data') return { label: 'No data yet', fill: null }
  if (!kpi.target || !kpi.color) return { label: 'Monitor only', fill: null }

  return STATUS[kpi.color]
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin' } }
  })
}

/** Title block shared by every sheet: title, subtitle, filter line. */
function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, filterLine: string) {
  sheet.addRow([title]).font = { bold: true, size: 14 }
  sheet.addRow([subtitle]).font = { italic: true, color: { argb: 'FF595959' } }
  sheet.addRow([filterLine]).font = { size: 9, color: { argb: 'FF595959' } }
}

/** Write a drill-down list: title, summary line, header, one row per item. */
function addDetailSheet(workbook: ExcelJS.Workbook, name: string, list: DrilldownList, filterLine: string, appUrl: string) {
  const sheet = workbook.addWorksheet(name)
  addTitle(sheet, list.title, list.subtitle, filterLine)
  const summaryItems = list.summary as { label: string; value: number | null; unit?: string }[]
  sheet.addRow([summaryItems.map(item => `${item.label}: ${item.value ?? '—'}${item.unit === '%' && item.value != null ? '%' : ''}`).join('   ·   ')]).font = {
    bold: true
  }
  sheet.addRow([])

  // A reason column expands to text + who/when, so the export keeps the audit info shown in the dialog.
  const columns = list.columns.flatMap(column =>
    column.type === 'reason'
      ? [column, { key: `${column.key}__by`, label: 'Reason updated by' }, { key: `${column.key}__at`, label: 'Reason updated at', type: 'date' }]
      : [column]
  )

  const header = sheet.addRow(columns.map(column => column.label))
  styleHeader(header)
  const headerRow = header.number

  for (const item of list.rows) {
    const values = columns.map(column => {
      const [key, part] = column.key.split('__')
      const value = (item as Record<string, unknown>)[key]
      if (part === 'by') return (value as { updatedBy?: string | null } | null)?.updatedBy ?? ''
      if (part === 'at') return isoToDate((value as { updatedAt?: string | null } | null)?.updatedAt)

      switch (column.type) {
        case 'date':
          return isoToDate(value as string | null)
        case 'number':
          return value ?? null
        case 'chip':
          return (value as { label?: string } | null)?.label ?? ''
        case 'reason':
          return (value as { text?: string | null } | null)?.text ?? ''
        case 'list':
          return Array.isArray(value) ? value.join('\n') : ''
        case 'wo': {
          const wo = value as { id: string; no: string | null; note?: string } | null
          if (!wo?.id) return ''
          const text = `${wo.no ?? 'Open'}${wo.note ? ` (${wo.note})` : ''}`

          return { text, hyperlink: `${appUrl}/maintenance-actuals/view/${wo.id}/` }
        }
        default:
          return value == null ? '' : String(value)
      }
    })
    const row = sheet.addRow(values)
    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1)
      if (column.type === 'date') cell.numFmt = DATE_FORMAT
      if (column.type === 'wo' && cell.value) cell.font = { color: { argb: 'FF0563C1' }, underline: true }
      if (column.type === 'list' || column.type === 'reason') cell.alignment = { wrapText: true, vertical: 'top' }
    })
  }

  columns.forEach((column, index) => {
    const width =
      column.type === 'date'
        ? 13
        : column.type === 'number'
          ? 12
          : column.type === 'wo'
            ? 24
            : column.type === 'reason' || column.type === 'list'
              ? 45
              : Math.min(
                  50,
                  Math.max(
                    column.label.length + 2,
                    ...list.rows.slice(0, 200).map(item => String((item as Record<string, unknown>)[column.key] ?? '').length + 2)
                  )
                )
    sheet.getColumn(index + 1).width = width
  })

  sheet.views = [{ state: 'frozen', ySplit: headerRow }]
  if (list.rows.length) sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columns.length } }
}

/** Build the workbook for the dashboard filter. Returns the file and a filename like maintenance-control-2026-10-YTD.xlsx. */
export async function buildControlWorkbook(session: Session, query: ControlQuery, timeZone = 'UTC') {
  const data = await loadControlData(session, query)
  const control = await getMaintenanceControl(session, query, data)
  const appUrl = getAppBaseUrl()

  const site = query.projectId || 'All sites'
  const program = data.selectedProgram?.name ?? 'All programs'
  const filterLine = `Period ${control.period.label} ${data.mode} (${data.periodStart} – ${data.periodEnd}) · Cut-off ${data.cutoff} · Site ${site} · Program ${program}`

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ARKA PCR'
  workbook.created = new Date()

  // ---- Summary: filter, KPI table, program table ----
  const summary = workbook.addWorksheet('Summary')
  addTitle(summary, 'Fundamental Maintenance Control', 'Right Work · Right Time · Right Quality · Higher Reliability', filterLine)
  summary.addRow([
    `Data last updated ${formatDateTime(data.dataUpdatedAt, timeZone)} · Generated ${formatDateTime(data.loadedAt, timeZone)} by ${session.user?.name ?? '-'}`
  ]).font = {
    size: 9,
    color: { argb: 'FF595959' }
  }
  summary.addRow([])

  styleHeader(summary.addRow(['Category', 'KPI', 'Value', 'Unit', 'Target', 'Status', 'Detail / note']))
  for (const category of CATEGORIES) {
    for (const code of category.codes) {
      const kpi = control.kpis[code]
      if (!kpi) continue
      const status = statusOf(kpi)

      const row = summary.addRow([
        category.title,
        kpi.label,
        kpi.value,
        kpi.unit === 'count' ? 'items' : kpi.unit,
        formatTarget(kpi),
        status.label,
        kpi.note ?? kpi.detail ?? ''
      ])
      if (status.fill) row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: status.fill } }
    }
  }

  summary.addRow([])
  summary.addRow(['Program performance']).font = { bold: true, size: 12 }
  styleHeader(
    summary.addRow(['Program', 'Plan', 'Actual', 'Achv. %', 'Due', 'On-time', 'On-time %', 'Overdue', 'Findings', 'Closed', 'Closure %', 'Repeat %'])
  )
  for (const row of control.programs) {
    summary.addRow([
      row.name,
      row.plan,
      row.actual,
      row.achievement,
      row.due,
      row.onTime,
      row.onTimeRate,
      row.overdue,
      row.findings,
      row.closed,
      row.closureRate,
      row.repeatRate
    ])
  }
  summary.addRow(['Overall', null, null, control.overallAchievement]).font = { bold: true }

  summary.addRow([])
  summary.addRow(['Top maintenance issues']).font = { bold: true, size: 12 }
  styleHeader(summary.addRow(['Issue', 'Frequency', 'Previous', 'Trend']))
  for (const issue of control.topIssues) summary.addRow([issue.label, issue.frequency, issue.previous, issue.trend])

  SUMMARY_WIDTHS.forEach((width, index) => {
    summary.getColumn(index + 1).width = width
  })

  // ---- Monthly trend (historical KPI) ----
  const trend = workbook.addWorksheet('Monthly Trend')
  addTitle(trend, `Monthly KPI trend ${data.year}`, 'Each month calculated on its own (cut-off = month end or today).', filterLine)
  trend.addRow([])
  styleHeader(trend.addRow(['Month', 'PM Compliance %', 'On-Time %', 'QC Pass %', 'PA %', 'MTBF (hrs)', 'MTTR (hrs)']))
  for (const item of control.trend) {
    trend.addRow([`${MONTHS_SHORT[item.month - 1]} ${data.year}`, item.pmCompliance, item.onTime, item.qcPass, item.pa, item.mtbf, item.mttr])
  }
  trend.addRow([])
  trend.addRow(['Backlog aging at month end']).font = { bold: true }
  styleHeader(trend.addRow(['Month', '0–7 days', '8–14 days', '15–30 days', '> 30 days', 'Total']))
  for (const item of control.backlogTrend) trend.addRow([item.label, item.b0_7, item.b8_14, item.b15_30, item.gt30, item.total])
  for (let index = 1; index <= 7; index += 1) trend.getColumn(index).width = 16

  // ---- One sheet per drill-down list ----
  for (const sheet of DETAIL_SHEETS) addDetailSheet(workbook, sheet.name, buildDrilldown(data, sheet.kind, sheet.options), filterLine, appUrl)

  const buffer = await workbook.xlsx.writeBuffer()
  const programPart = data.selectedProgram ? `-${data.selectedProgram.name.replace(/[^\w-]+/g, '')}` : ''
  const filename = `maintenance-control-${data.year}-${String(data.month).padStart(2, '0')}-${data.mode}${query.projectId ? `-${query.projectId}` : ''}${programPart}.xlsx`

  return { buffer, filename }
}
