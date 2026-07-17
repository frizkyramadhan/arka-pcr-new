/**
 * Engine workflow approval generik — dipakai PCR forecast & Cannibal BA.
 * Logika revoke/revisi: level APPROVED + semua level setelahnya masih PENDING.
 */
import type { Session } from 'next-auth'

import { getChainLevelOrder, permissionCodeForLevel, type ApprovalChainConfig } from '@/lib/approval/registry'
import { hasPermission } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export type ApprovalRow = {
  level: string
  status: string
}

export type ApprovalWorkflowEngine = ReturnType<typeof createApprovalWorkflow>

function approvalStatusMap(approvals: ApprovalRow[]): Map<string, string> {
  return new Map(approvals.map(row => [row.level, row.status]))
}

export function createApprovalWorkflow(chain: ApprovalChainConfig) {
  const levelOrder = getChainLevelOrder(chain)
  const projectScopedLevels = new Set(
    chain.levels.filter(item => item.projectScoped).map(item => item.level)
  )

  function canAccessLevel(session: Session, level: string, projectCode?: string): boolean {
    if (!hasPermission(session, permissionCodeForLevel(chain, level))) return false

    if (projectScopedLevels.has(level) && projectCode && !canAccessProject(session, projectCode)) {
      return false
    }

    return true
  }

  function arePriorLevelsApproved(approvals: ApprovalRow[], level: string): boolean {
    const byLevel = approvalStatusMap(approvals)
    const index = levelOrder.indexOf(level)
    if (index <= 0) return true

    for (let i = 0; i < index; i += 1) {
      if (byLevel.get(levelOrder[i]) !== 'APPROVED') return false
    }

    return true
  }

  function areSubsequentLevelsPending(approvals: ApprovalRow[], level: string): boolean {
    const byLevel = approvalStatusMap(approvals)
    const index = levelOrder.indexOf(level)

    for (let i = index + 1; i < levelOrder.length; i += 1) {
      if (byLevel.get(levelOrder[i]) !== 'PENDING') return false
    }

    return true
  }

  function getCurrentPendingLevel(approvals: ApprovalRow[]): string | null {
    const byLevel = approvalStatusMap(approvals)

    for (const level of levelOrder) {
      if (byLevel.get(level) === 'PENDING' && arePriorLevelsApproved(approvals, level)) {
        return level
      }
    }

    return null
  }

  function isStepReady(approvals: ApprovalRow[], level: string): boolean {
    const byLevel = approvalStatusMap(approvals)
    if (byLevel.get(level) !== 'PENDING') return false

    return arePriorLevelsApproved(approvals, level)
  }

  function isFullyApproved(approvals: ApprovalRow[]): boolean {
    const byLevel = approvalStatusMap(approvals)

    return levelOrder.every(level => byLevel.get(level) === 'APPROVED')
  }

  function canActOnLevel(
    approvals: ApprovalRow[],
    level: string,
    session: Session,
    projectCode?: string
  ): boolean {
    if (!canAccessLevel(session, level, projectCode)) return false

    return isStepReady(approvals, level)
  }

  function canReviseLevel(
    approvals: ApprovalRow[],
    level: string,
    session: Session,
    projectCode?: string
  ): boolean {
    if (!canAccessLevel(session, level, projectCode)) return false

    const row = approvals.find(approval => approval.level === level)
    if (row?.status !== 'APPROVED') return false

    return areSubsequentLevelsPending(approvals, level)
  }

  function canApproveAtLevel(
    approvals: ApprovalRow[],
    level: string,
    session: Session,
    projectCode?: string
  ): boolean {
    if (!canAccessLevel(session, level, projectCode)) return false

    const status = approvalStatusMap(approvals).get(level)
    if (status === 'PENDING') return isStepReady(approvals, level)
    if (status === 'APPROVED') return canReviseLevel(approvals, level, session, projectCode)

    return false
  }

  function canRejectAtLevel(
    approvals: ApprovalRow[],
    level: string,
    session: Session,
    projectCode?: string
  ): boolean {
    if (!canAccessLevel(session, level, projectCode)) return false

    const status = approvalStatusMap(approvals).get(level)
    if (status === 'PENDING') return isStepReady(approvals, level)
    if (status === 'APPROVED') return areSubsequentLevelsPending(approvals, level)

    return false
  }

  function canRevokeAtLevel(
    approvals: ApprovalRow[],
    level: string,
    session: Session,
    projectCode?: string
  ): boolean {
    return canReviseLevel(approvals, level, session, projectCode)
  }

  function getActionableLevels(
    approvals: ApprovalRow[],
    session: Session,
    projectCode?: string,
    options?: { inApprovalFlow?: boolean }
  ): string[] {
    if (options?.inApprovalFlow === false) return []

    const levels: string[] = []
    const current = getCurrentPendingLevel(approvals)

    if (current && canActOnLevel(approvals, current, session, projectCode)) {
      levels.push(current)
    }

    for (const level of levelOrder) {
      if (canReviseLevel(approvals, level, session, projectCode) && !levels.includes(level)) {
        levels.push(level)
      }
    }

    return levels
  }

  return {
    chain,
    levelOrder,
    arePriorLevelsApproved,
    areSubsequentLevelsPending,
    getCurrentPendingLevel,
    isStepReady,
    isFullyApproved,
    canAccessLevel,
    canActOnLevel,
    canReviseLevel,
    canApproveAtLevel,
    canRejectAtLevel,
    canRevokeAtLevel,
    getActionableLevels
  }
}
