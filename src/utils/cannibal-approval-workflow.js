/**
 * Client-side Cannibal BA approval workflow — mirrors lib/cannibal/approval-workflow.ts.
 */
import { canAccessProject } from 'src/utils/project-scope'
import {
  CANNIBAL_APPROVAL_LEVEL_ORDER,
  CANNIBAL_BA_APPROVAL_CHAIN,
  CANNIBAL_PROJECT_SCOPED_LEVELS
} from 'src/utils/approval-registry'

export { CANNIBAL_APPROVAL_LEVEL_ORDER } from 'src/utils/approval-registry'

function approvalStatusMap(approvals) {
  return new Map((approvals ?? []).map(row => [row.level, row.status]))
}

function arePriorLevelsApproved(approvals, level) {
  const byLevel = approvalStatusMap(approvals)
  const index = CANNIBAL_APPROVAL_LEVEL_ORDER.indexOf(level)
  if (index <= 0) return true

  for (let i = 0; i < index; i += 1) {
    if (byLevel.get(CANNIBAL_APPROVAL_LEVEL_ORDER[i]) !== 'APPROVED') return false
  }

  return true
}

function isBaInApprovalFlow(statusBa) {
  return statusBa === 'SUBMITTED' || statusBa === 'OPEN'
}

function isBaStepPending(ba, level) {
  if (!isBaInApprovalFlow(ba?.statusBa)) return false

  const byLevel = approvalStatusMap(ba?.approvals)
  if (byLevel.get(level) !== 'PENDING') return false

  return arePriorLevelsApproved(ba.approvals, level)
}

/** True when every level after `level` is still PENDING. */
export function areSubsequentCannibalLevelsPending(ba, level) {
  const approvals = ba?.approvals ?? []
  const byLevel = approvalStatusMap(approvals)
  const index = CANNIBAL_APPROVAL_LEVEL_ORDER.indexOf(level)

  for (let i = index + 1; i < CANNIBAL_APPROVAL_LEVEL_ORDER.length; i += 1) {
    if (byLevel.get(CANNIBAL_APPROVAL_LEVEL_ORDER[i]) !== 'PENDING') return false
  }

  return true
}

function canAccessCannibalApprovalLevel(ba, level, can, user) {
  if (!can(`cannibals.approve.${level}`)) return false

  if (CANNIBAL_PROJECT_SCOPED_LEVELS.includes(level) && !canAccessProject(user, ba?.projectCode)) {
    return false
  }

  return true
}

export function canActOnCannibalApproval(ba, level, can, user) {
  if (!canAccessCannibalApprovalLevel(ba, level, can, user)) return false

  return isBaStepPending(ba, level)
}

/** Prior approver may change decision while all later levels are still pending. */
export function canReviseCannibalApproval(ba, level, can, user) {
  if (!canAccessCannibalApprovalLevel(ba, level, can, user)) return false

  const row = ba?.approvals?.find(item => item.level === level)
  if (row?.status !== 'APPROVED') return false

  return areSubsequentCannibalLevelsPending(ba, level)
}

export function canApproveCannibalLevel(ba, level, can, user) {
  if (!canAccessCannibalApprovalLevel(ba, level, can, user)) return false

  const status = approvalStatusMap(ba?.approvals).get(level)
  if (status === 'PENDING') return isBaStepPending(ba, level)
  if (status === 'APPROVED') return canReviseCannibalApproval(ba, level, can, user)

  return false
}

export function canRejectCannibalLevel(ba, level, can, user) {
  if (!canAccessCannibalApprovalLevel(ba, level, can, user)) return false

  const status = approvalStatusMap(ba?.approvals).get(level)
  if (status === 'PENDING') return isBaStepPending(ba, level)
  if (status === 'APPROVED') return areSubsequentCannibalLevelsPending(ba, level)

  return false
}

export function getCannibalActionableLevels(ba, can, user) {
  const levels = []

  for (const level of CANNIBAL_APPROVAL_LEVEL_ORDER) {
    if (canActOnCannibalApproval(ba, level, can, user)) {
      levels.push(level)
    }
  }

  for (const level of CANNIBAL_APPROVAL_LEVEL_ORDER) {
    if (canReviseCannibalApproval(ba, level, can, user) && !levels.includes(level)) {
      levels.push(level)
    }
  }

  return levels
}

export function findActionableCannibalApproval(ba, approveLevels, can, user) {
  if (!ba?.approvals?.length) return null

  for (const level of CANNIBAL_APPROVAL_LEVEL_ORDER) {
    const levelAllowed = !approveLevels?.length || approveLevels.includes(level)
    if (levelAllowed && canActOnCannibalApproval(ba, level, can, user)) {
      const approval = ba.approvals.find(item => item.level === level && item.status === 'PENDING')
      if (approval) return { ...approval, actionMode: 'pending' }
    }
  }

  for (let i = CANNIBAL_APPROVAL_LEVEL_ORDER.length - 1; i >= 0; i -= 1) {
    const level = CANNIBAL_APPROVAL_LEVEL_ORDER[i]
    const levelAllowed = !approveLevels?.length || approveLevels.includes(level)
    if (levelAllowed && canReviseCannibalApproval(ba, level, can, user)) {
      const approval = ba.approvals.find(item => item.level === level && item.status === 'APPROVED')
      if (approval) return { ...approval, actionMode: 'revise' }
    }
  }

  return null
}

export function getCurrentCannibalFlowStage(ba) {
  const statusBa = ba?.statusBa
  const approvals = ba?.approvals ?? []

  if (!statusBa || statusBa === 'DRAFT') return 'Draft — Plant Input'
  if (statusBa === 'REJECTED') return 'Ditolak — revisi plant'
  if (statusBa === 'PENDING_REQUESTOR') return 'Menunggu Request By'
  if (statusBa === 'PENDING_LOGISTICS') return 'Menunggu Logistics'
  if (statusBa === 'PENDING_DOCUMENT') return 'Record & Documentation'
  if (statusBa === 'APPROVED') return 'Disetujui — siap close'
  if (statusBa === 'CLOSED') return 'BA ditutup'
  if (statusBa === 'CANCELLED') return 'Dibatalkan'
  if (!isBaInApprovalFlow(statusBa)) return statusBa

  for (const item of CANNIBAL_BA_APPROVAL_CHAIN.levels) {
    const level = item.level
    if (isBaStepPending(ba, level)) {
      return `Menunggu ${item.label}`
    }
  }

  const byLevel = approvalStatusMap(approvals)

  const allApproved = CANNIBAL_BA_APPROVAL_CHAIN.levels.every(
    item => byLevel.get(item.level) === 'APPROVED'
  )
  if (allApproved) return 'Disetujui sepenuhnya'

  return 'Dalam proses approval'
}

/** Level display: APPROVED | REVISABLE | REJECTED | ACTIVE | WAITING */
export function getCannibalLevelFlowStatus(ba, level) {
  const row = ba?.approvals?.find(item => item.level === level)
  if (!row) return 'WAITING'
  if (row.status === 'APPROVED') {
    if (isBaInApprovalFlow(ba?.statusBa) && areSubsequentCannibalLevelsPending(ba, level)) {
      return 'REVISABLE'
    }

    return 'APPROVED'
  }
  if (row.status === 'REJECTED' || row.status === 'NOT APPROVED') return 'REJECTED'
  if (isBaStepPending(ba, level)) return 'ACTIVE'

  return 'WAITING'
}

/** Latest non-empty remark from any completed approval step. */
export function getLatestCannibalApprovalRemark(ba) {
  const approvals = ba?.approvals ?? []
  const withRemark = [...approvals].reverse().find(item => typeof item.remark === 'string' && item.remark.trim())

  return withRemark?.remark?.trim() ?? ''
}

export function getCannibalLevelFlowLabel(status) {
  switch (status) {
    case 'APPROVED':
      return 'APPROVED'
    case 'REVISABLE':
      return 'CAN REVISE'
    case 'REJECTED':
      return 'NOT APPROVED'
    case 'ACTIVE':
      return 'IN REVIEW'
    default:
      return 'WAITING'
  }
}
