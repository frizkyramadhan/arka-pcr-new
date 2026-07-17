/**
 * Cannibal BA staged workflow — plant → logistics → approval → documentation.
 */
import type { Session } from 'next-auth'

import { hasLogisticStatement, hasPlantStatement } from '@/lib/cannibal/pair-helpers'
import {
  EXECUTION_EDITABLE_STATUSES,
  LOGISTIC_EDITABLE_STATUSES,
  PLANT_EDITABLE_STATUSES,
  type BaStatus
} from '@/lib/cannibal/types'
import { canManageCannibalLogisticStatement } from '@/lib/cannibal/logistic-access'
import { hasPermission } from '@/lib/utils/api-auth'

export const CANNIBAL_WORKFLOW_STEPS = [
  { key: 'plant', label: 'Plant Input' },
  { key: 'logistics', label: 'Logistics Statement' },
  { key: 'approval', label: 'Approval' },
  { key: 'documentation', label: 'Record & Documentation' },
  { key: 'closed', label: 'Closed' }
] as const

export type CannibalWorkflowStepKey = (typeof CANNIBAL_WORKFLOW_STEPS)[number]['key']

export function getCannibalWorkflowStep(statusBa?: string | null): CannibalWorkflowStepKey {
  switch (statusBa) {
    case 'DRAFT':
    case 'REJECTED':
      return 'plant'
    case 'PENDING_LOGISTICS':
      return 'logistics'
    case 'SUBMITTED':
    case 'OPEN':
      return 'approval'
    case 'APPROVED':
      return 'documentation'
    case 'CLOSED':
      return 'closed'
    default:
      return 'plant'
  }
}

export function getCannibalWorkflowStepIndex(statusBa?: string | null): number {
  const step = getCannibalWorkflowStep(statusBa)
  return CANNIBAL_WORKFLOW_STEPS.findIndex(item => item.key === step)
}

export function isPlantSectionComplete(data: {
  symptom?: string
  failure?: string
  plantP1UnitRfu?: boolean
  plantProductionReq?: boolean
  plantOther?: boolean
  plantOtherText?: string
}): boolean {
  if (!data.symptom?.trim() || !data.failure?.trim()) return false
  if (!hasPlantStatement(data)) return false
  if (data.plantOther && !data.plantOtherText?.trim()) return false

  return true
}

export function isLogisticSectionComplete(data: {
  logisticNoStock?: boolean
  logisticLeadTime?: boolean
  logisticLeadTimeDays?: number | null
  logisticOther?: boolean
  logisticOtherText?: string
}): boolean {
  if (!hasLogisticStatement(data)) return false
  if (data.logisticOther && !data.logisticOtherText?.trim()) return false
  if (data.logisticLeadTime && (!data.logisticLeadTimeDays || data.logisticLeadTimeDays <= 0)) return false

  return true
}

export function canEditPlantSection(session: Session, statusBa: BaStatus): boolean {
  if (!hasPermission(session, 'cannibals.update')) return false

  return PLANT_EDITABLE_STATUSES.includes(statusBa)
}

export function canSubmitPlantToLogistics(session: Session, statusBa: BaStatus): boolean {
  if (!hasPermission(session, 'cannibals.update')) return false

  return PLANT_EDITABLE_STATUSES.includes(statusBa)
}

export function canEditLogisticSection(session: Session, statusBa: BaStatus): boolean {
  const permissions = session.user?.permissions ?? []
  const roles = session.user?.roles ?? []

  if (!canManageCannibalLogisticStatement(permissions, roles)) return false

  return LOGISTIC_EDITABLE_STATUSES.includes(statusBa)
}

export function canConfirmLogisticStatement(session: Session, statusBa: BaStatus): boolean {
  if (!canManageCannibalLogisticStatement(session.user?.permissions ?? [], session.user?.roles ?? [])) {
    return false
  }

  return LOGISTIC_EDITABLE_STATUSES.includes(statusBa)
}

export function canSubmitForApproval(session: Session, statusBa: BaStatus): boolean {
  if (!canManageCannibalLogisticStatement(session.user?.permissions ?? [], session.user?.roles ?? [])) {
    return false
  }

  return statusBa === 'PENDING_LOGISTICS'
}

export function canEditExecutionSection(session: Session, statusBa: BaStatus): boolean {
  if (!hasPermission(session, 'cannibals.update')) return false

  return EXECUTION_EDITABLE_STATUSES.includes(statusBa)
}

export function isExecutionComplete(ba: {
  documentationComplete?: boolean
  executionNotes?: string | null
  pairs?: Array<{ remove?: { woNoKanibal?: string | null }; install?: { woNoKanibal?: string | null } }>
}): boolean {
  if (!ba.documentationComplete) return false
  if (!ba.executionNotes?.trim()) return false

  const pairs = ba.pairs ?? []
  if (pairs.length === 0) return false

  return pairs.every(pair => pair.remove?.woNoKanibal?.trim() && pair.install?.woNoKanibal?.trim())
}
