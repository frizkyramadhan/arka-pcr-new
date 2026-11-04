/**
 * Shape the breakdown report like the site Excel board:
 * all units in a project, plant-group headers, RFU/BD, aging, and category totals.
 * Only BD rows carry description, HM BD, start, aging, and process status.
 */

export type BreakdownReportSource = {
  id: string
  listNo?: number
  fleetUnitId?: number
  unitNo: string
  plantGroup?: string | null
  plantType?: string | null
  startedAt: string
  finishedAt: string | null
  problem: string
  hourMeter: number | null

  /** Latest unit HM from ARKFleet/HM table — shown on RFU rows in HM Update. */
  hmUpdate?: number | null

  /** ISO date YYYY-MM-DD from breakdown.eta_rfu_date (BD only). */
  etaRfuDate?: string | null

  /** Estimated days to RFU if parts supplied (BD only). */
  etaRfuIfPart?: number | null
  statusUnit: string
  latestCode?: string | null
  latestCodeName?: string | null
  projectCode?: string
  workOrder?: string | null
  modelName?: string | null
  remark?: string | null
}

export type BreakdownReportRow = BreakdownReportSource & {
  rowType: 'group' | 'data' | 'total'
  statusRfu: string
  statusBd: string
  agingBd: string
  processStatus: string
  hmUpdate: number | null
  etaRfuDate: string | null
  etaRfuIfPart: number | null
  groupLabel?: string
}

/** Calendar days from BD start to finish, or to now while still open. */
export function agingBdLabel(startedAt: string, finishedAt: string | null, now = Date.now()): string {
  const start = new Date(startedAt).getTime()
  if (!Number.isFinite(start)) return '—'
  const end = finishedAt ? new Date(finishedAt).getTime() : now
  if (!Number.isFinite(end) || end < start) return '—'
  const days = Math.floor((end - start) / 86400000)

  return `${days} day${days === 1 ? '' : 's'}`
}

function groupKey(row: BreakdownReportSource): string {
  const label = (row.plantGroup || '').trim()

  return label || 'OTHER'
}

export type BreakdownReportGroup = {
  key: string
  label: string
  rfu: number
  bd: number
  rows: BreakdownReportRow[]
}

function toDataRow(item: BreakdownReportSource, listNo: number, now: number): BreakdownReportRow {
  const isRfu = item.statusUnit === 'RFU'

  return {
    ...item,
    rowType: 'data',
    listNo,
    statusRfu: isRfu ? 'RFU' : '',
    statusBd: isRfu ? '' : 'BD',

    // RFU keeps BD detail empty, but still shows the latest unit HM in HM Update.
    problem: isRfu ? '' : item.problem,
    hourMeter: isRfu ? null : item.hourMeter,
    startedAt: isRfu ? '' : item.startedAt,
    agingBd: isRfu ? '' : agingBdLabel(item.startedAt, item.finishedAt, now),
    processStatus: isRfu
      ? ''
      : [item.latestCode, item.latestCodeName].filter(Boolean).join(' · ') || item.statusUnit || '—',
    hmUpdate: isRfu ? item.hmUpdate ?? null : item.hourMeter,
    etaRfuDate: isRfu ? null : item.etaRfuDate ?? null,
    etaRfuIfPart: isRfu ? null : item.etaRfuIfPart ?? null
  }
}

/** Plant-group sections for collapse/expand board UI. */
export function partitionBreakdownReportGroups(
  rows: BreakdownReportSource[],
  now = Date.now()
): BreakdownReportGroup[] {
  const byGroup = new Map<string, BreakdownReportSource[]>()
  for (const row of rows) {
    const key = groupKey(row)
    const list = byGroup.get(key)
    if (list) list.push(row)
    else byGroup.set(key, [row])
  }

  return [...byGroup.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map(key => {
      const items = [...(byGroup.get(key) ?? [])].sort((left, right) => left.unitNo.localeCompare(right.unitNo))
      let rfu = 0
      let bd = 0

      const dataRows = items.map((item, index) => {
        const row = toDataRow(item, index + 1, now)
        if (row.statusRfu === 'RFU') rfu += 1
        else bd += 1

        return row
      })

      return {
        key,
        label: key.toUpperCase(),
        rfu,
        bd,
        rows: dataRows
      }
    })
}

/** Flat board with category headers and totals (Excel export). */
export function groupBreakdownReportRows(rows: BreakdownReportSource[], now = Date.now()): BreakdownReportRow[] {
  const out: BreakdownReportRow[] = []

  for (const group of partitionBreakdownReportGroups(rows, now)) {
    out.push({
      id: `group:${group.key}`,
      rowType: 'group',
      groupLabel: group.label,
      unitNo: group.label,
      plantGroup: group.key,
      startedAt: '',
      finishedAt: null,
      problem: '',
      hourMeter: null,
      statusUnit: '',
      statusRfu: '',
      statusBd: '',
      agingBd: '',
      processStatus: '',
      hmUpdate: null,
      etaRfuDate: null,
      etaRfuIfPart: null
    })
    out.push(...group.rows)
    out.push({
      id: `total:${group.key}`,
      rowType: 'total',
      groupLabel: group.label,
      unitNo: 'Total',
      plantGroup: group.key,
      startedAt: '',
      finishedAt: null,
      problem: '',
      hourMeter: null,
      statusUnit: '',
      statusRfu: String(group.rfu),
      statusBd: String(group.bd),
      agingBd: '',
      processStatus: '',
      hmUpdate: null,
      etaRfuDate: null,
      etaRfuIfPart: null
    })
  }

  return out
}
