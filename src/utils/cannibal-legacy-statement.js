/**
 * Client helpers — detect missing plant/logistic statements on legacy cannibal BA.
 */
import { hasLogisticStatement, hasPlantStatement } from '@/lib/cannibal/pair-helpers'
import { LOGISTIC_EDITABLE_STATUSES, PLANT_EDITABLE_STATUSES } from '@/lib/cannibal/types'

const LEGACY_STATEMENT_BACKFILL_STATUSES = [
  'SUBMITTED',
  'OPEN',
  'APPROVED',
  'CLOSED',
  'PENDING_LOGISTICS',
  'PENDING_DOCUMENT'
]

export function isMissingPlantStatement(ba) {
  return !hasPlantStatement(ba ?? {})
}

export function isMissingLogisticStatement(ba) {
  return !hasLogisticStatement(ba ?? {})
}

export function canBackfillPlantStatement(statusBa) {
  return LEGACY_STATEMENT_BACKFILL_STATUSES.includes(statusBa) && !PLANT_EDITABLE_STATUSES.includes(statusBa)
}

export function canBackfillLogisticStatement(statusBa) {
  return LEGACY_STATEMENT_BACKFILL_STATUSES.includes(statusBa) && !LOGISTIC_EDITABLE_STATUSES.includes(statusBa)
}

export function showPlantStatementUpdateAction(ba, canEditPlant) {
  if (!ba || !canEditPlant || !isMissingPlantStatement(ba)) return false

  return PLANT_EDITABLE_STATUSES.includes(ba.statusBa) || canBackfillPlantStatement(ba.statusBa)
}

export function showLogisticStatementUpdateAction(ba, canEditLogistic) {
  if (!ba || !canEditLogistic || !isMissingLogisticStatement(ba)) return false

  return LOGISTIC_EDITABLE_STATUSES.includes(ba.statusBa) || canBackfillLogisticStatement(ba.statusBa)
}

export function isLegacyPlantStatementSave(ba) {
  return Boolean(ba) && canBackfillPlantStatement(ba.statusBa)
}

export function isLegacyLogisticStatementSave(ba) {
  return Boolean(ba) && canBackfillLogisticStatement(ba.statusBa)
}
