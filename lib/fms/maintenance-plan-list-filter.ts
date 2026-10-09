/**
 * Filter list Maintenance Plan yang sama untuk grid dan export Excel.
 * Year, month, dan maintenance type. Project yang dipilih user ikut di sini.
 * Scope site (projectCodes sesi) tetap di resolveProjectIdFilter pada API;
 * mengosongkan filter project tidak boleh melebarkan export ke site lain.
 */

export type PlanListFilterInput = {
  projectId?: string | number | null
  year?: string | number | null
  month?: string | number | null
  maintenanceTypeId?: string | null
  withDetails?: boolean

  /** Unduhan Excel list. Mengirim export=1 agar API menolak tanpa exports.maintenance_plans. */
  forExport?: boolean
}

export type PlanHeaderWhere = {
  year?: number
  month?: number
  maintenanceTypeId?: string
}

export type PlanExportSource = {
  projectId?: string | null
  year?: number | string | null
  month?: number | string | null
  maintenanceTypeId?: string | null
  maintenanceTypeName?: string | null
  details?: Array<{ unitNo?: string | null; planDate?: string | null } | null> | null
}

export type PlanExportRow = {
  Project: string | number
  Year: string | number
  Month: string | number
  Unit: string
  'Plan Date': string
  'Maintenance Type': string
}

function hasText(value: unknown): boolean {
  return value !== undefined && value !== null && String(value) !== ''
}

/** Where year/month/type. Project tidak di sini supaya scope sesi yang menang di server. */
export function planHeaderWhere(query: PlanListFilterInput): PlanHeaderWhere {
  const where: PlanHeaderWhere = {}

  if (hasText(query.year)) {
    const y = parseInt(String(query.year), 10)
    if (!Number.isNaN(y)) where.year = y
  }

  if (hasText(query.month)) {
    const m = parseInt(String(query.month), 10)
    if (!Number.isNaN(m) && m >= 1 && m <= 12) where.month = m
  }

  const maintenanceTypeId = typeof query.maintenanceTypeId === 'string' ? query.maintenanceTypeId.trim() : ''
  if (maintenanceTypeId) where.maintenanceTypeId = maintenanceTypeId

  return where
}

/** Header plan lolos filter yang sedang tampil. Project kosong = semua site yang API izinkan. */
export function planMatchesListFilters(
  plan: Pick<PlanExportSource, 'projectId' | 'year' | 'month' | 'maintenanceTypeId'>,
  filters: PlanListFilterInput
): boolean {
  const projectId = filters.projectId != null ? String(filters.projectId).trim() : ''
  if (projectId && String(plan.projectId ?? '') !== projectId) return false

  const header = planHeaderWhere(filters)
  if (header.year !== undefined && Number(plan.year) !== header.year) return false
  if (header.month !== undefined && Number(plan.month) !== header.month) return false
  if (header.maintenanceTypeId && String(plan.maintenanceTypeId ?? '') !== header.maintenanceTypeId) return false

  return true
}

export function filterPlansForExport<T extends PlanExportSource>(plans: T[], filters: PlanListFilterInput): T[] {
  return (plans || []).filter(plan => planMatchesListFilters(plan, filters))
}

/**
 * Query GET /api/maintenance-plans. Filter kosong tidak dikirim (All).
 * withDetails menambah details=1 untuk baris tanggal unit di Excel.
 * forExport menambah export=1; GET menolak request itu tanpa exports.maintenance_plans.
 */
export function planListRequestParams(filters: PlanListFilterInput): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.projectId) params.projectId = String(filters.projectId)
  if (filters.year) params.year = String(filters.year)
  if (filters.month) params.month = String(filters.month)
  if (filters.maintenanceTypeId) params.maintenanceTypeId = String(filters.maintenanceTypeId)
  if (filters.withDetails) params.details = '1'
  if (filters.forExport) params.export = '1'

  return params
}

/**
 * Baris Excel dari rencana yang lolos filter layar.
 * Panggil dengan maintenancePlans (sudah di-scope API), bukan allData.
 */
export function planExportRows(plans: PlanExportSource[], filters: PlanListFilterInput): PlanExportRow[] {
  const rows: PlanExportRow[] = []

  for (const plan of filterPlansForExport(plans, filters)) {
    for (const detail of plan.details || []) {
      if (!detail?.unitNo || !detail?.planDate) continue
      rows.push({
        Project: plan.projectId ?? '',
        Year: plan.year ?? '',
        Month: plan.month ?? '',
        Unit: detail.unitNo,
        'Plan Date': detail.planDate,
        'Maintenance Type': plan.maintenanceTypeName ?? ''
      })
    }
  }

  return rows
}
