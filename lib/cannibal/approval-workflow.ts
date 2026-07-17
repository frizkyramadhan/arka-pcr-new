import type { Session } from 'next-auth'

import { cannibalBaApprovalWorkflow } from '@/lib/approval/instances'
import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  getChainLevelOrder,
  type CannibalBaApprovalLevel
} from '@/lib/approval/registry'
import { CANNIBAL_PROJECT_SCOPED_LEVELS, getCannibalApprovalLabel } from '@/lib/cannibal/approval-labels'
import type { BaApprovalLevel } from '@/lib/cannibal/types'

export type BaApprovalRow = {
  level: string
  status: string
}

export type BaApprovalContext = {
  statusBa: string
  projectCode: string
  approvals: BaApprovalRow[]
}

const engine = cannibalBaApprovalWorkflow
const levelOrder = getChainLevelOrder(CANNIBAL_BA_APPROVAL_CHAIN)

export function isBaInApprovalFlow(statusBa: string): boolean {
  return statusBa === 'SUBMITTED' || statusBa === 'OPEN'
}

export function areSubsequentBaLevelsPending(approvals: BaApprovalRow[], level: BaApprovalLevel): boolean {
  return engine.areSubsequentLevelsPending(approvals, level)
}

export function canActOnBaApproval(ba: BaApprovalContext, level: BaApprovalLevel, session: Session): boolean {
  if (!isBaInApprovalFlow(ba.statusBa)) return false

  return engine.canActOnLevel(ba.approvals, level, session, ba.projectCode)
}

export function canReviseBaApproval(ba: BaApprovalContext, level: BaApprovalLevel, session: Session): boolean {
  return engine.canReviseLevel(ba.approvals, level, session, ba.projectCode)
}

export function canApproveAtBaLevel(ba: BaApprovalContext, level: BaApprovalLevel, session: Session): boolean {
  return engine.canApproveAtLevel(ba.approvals, level, session, ba.projectCode)
}

export function canRejectAtBaLevel(ba: BaApprovalContext, level: BaApprovalLevel, session: Session): boolean {
  return engine.canRejectAtLevel(ba.approvals, level, session, ba.projectCode)
}

export function canRevokeBaApproval(ba: BaApprovalContext, level: BaApprovalLevel, session: Session): boolean {
  return engine.canRevokeAtLevel(ba.approvals, level, session, ba.projectCode)
}

export function getPendingLevelForBa(ba: BaApprovalContext): BaApprovalLevel | null {
  if (!isBaInApprovalFlow(ba.statusBa)) return null

  return engine.getCurrentPendingLevel(ba.approvals) as BaApprovalLevel | null
}

export function isBaFullyApproved(approvals: BaApprovalRow[]): boolean {
  return engine.isFullyApproved(approvals)
}

export function getActionableLevels(ba: BaApprovalContext, session: Session): BaApprovalLevel[] {
  if (!isBaInApprovalFlow(ba.statusBa)) return []

  return engine.getActionableLevels(ba.approvals, session, ba.projectCode) as BaApprovalLevel[]
}

export function getApprovalStatusForLevel(approvals: BaApprovalRow[], level: BaApprovalLevel): string {
  return approvals.find(approval => approval.level === level)?.status ?? 'PENDING'
}

export { getCannibalApprovalLabel, CANNIBAL_PROJECT_SCOPED_LEVELS }

/** @deprecated Gunakan getChainLevelOrder(CANNIBAL_BA_APPROVAL_CHAIN) */
export const BA_APPROVAL_LEVEL_ORDER = levelOrder as CannibalBaApprovalLevel[]
