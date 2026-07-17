/**
 * Normalize cannibal BA status for dashboard KPIs / achievement.
 * Legacy data uses CLOSE/CANCEL and often leaves fully-approved BA as OPEN.
 */

export type CannibalPipelineBucket =
  | 'draft'
  | 'pendingLogistics'
  | 'inApproval'
  | 'approved'
  | 'rejected'
  | 'closed'
  | 'cancelled'

export type BaStatusLegacyFields = {
  statusBa: string
  statusL1?: string | null
  statusL2?: string | null
  statusL3?: string | null
}

/** Year bounds for @db.Date posting_date (UTC calendar days). */
export function postingYearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lte: new Date(Date.UTC(year, 11, 31))
  }
}

export function isCancelledBaStatus(statusBa: string): boolean {
  const status = statusBa?.toUpperCase?.() ?? statusBa

  return status === 'CANCELLED' || status === 'CANCEL'
}

/**
 * Closed for Ach%: explicit CLOSED/CLOSE, or legacy OPEN with L1–L3 all APPROVED.
 */
export function isEffectivelyClosedBa(row: BaStatusLegacyFields): boolean {
  const status = row.statusBa?.toUpperCase?.() ?? row.statusBa
  if (status === 'CLOSED' || status === 'CLOSE') return true

  if (status !== 'OPEN') return false

  return row.statusL1 === 'APPROVED' && row.statusL2 === 'APPROVED' && row.statusL3 === 'APPROVED'
}

/** Map BA row to a single pipeline bucket for KPI cards / charts. */
export function classifyCannibalBa(row: BaStatusLegacyFields): CannibalPipelineBucket {
  const status = row.statusBa?.toUpperCase?.() ?? row.statusBa

  if (isCancelledBaStatus(status)) return 'cancelled'
  if (isEffectivelyClosedBa(row)) return 'closed'
  if (status === 'DRAFT') return 'draft'
  if (status === 'PENDING_LOGISTICS') return 'pendingLogistics'
  if (status === 'APPROVED') return 'approved'
  if (status === 'REJECTED') return 'rejected'
  if (status === 'SUBMITTED' || status === 'OPEN') return 'inApproval'

  return 'inApproval'
}
