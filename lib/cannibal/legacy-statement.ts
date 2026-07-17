/**
 * Legacy cannibal BA — backfill plant/logistic statements on migrated records.
 */
import { hasLogisticStatement, hasPlantStatement } from '@/lib/cannibal/pair-helpers'
import { LOGISTIC_EDITABLE_STATUSES, PLANT_EDITABLE_STATUSES, type BaStatus } from '@/lib/cannibal/types'

/** Statuses past normal plant/logistic workflow where statement data may be missing. */
export const LEGACY_STATEMENT_BACKFILL_STATUSES: BaStatus[] = ['SUBMITTED', 'OPEN', 'APPROVED', 'CLOSED', 'PENDING_LOGISTICS']

export function isMissingPlantStatement(data: {
  plantP1UnitRfu?: boolean
  plantProductionReq?: boolean
  plantOther?: boolean
}): boolean {
  return !hasPlantStatement(data)
}

export function isMissingLogisticStatement(data: {
  logisticNoStock?: boolean
  logisticLeadTime?: boolean
  logisticOther?: boolean
}): boolean {
  return !hasLogisticStatement(data)
}

/** Legacy backfill — not the normal draft/rejected plant edit flow. */
export function canBackfillPlantStatement(statusBa: BaStatus): boolean {
  return LEGACY_STATEMENT_BACKFILL_STATUSES.includes(statusBa) && !PLANT_EDITABLE_STATUSES.includes(statusBa)
}

/** Legacy backfill — not the normal pending-logistics workflow. */
export function canBackfillLogisticStatement(statusBa: BaStatus): boolean {
  return LEGACY_STATEMENT_BACKFILL_STATUSES.includes(statusBa) && !LOGISTIC_EDITABLE_STATUSES.includes(statusBa)
}
