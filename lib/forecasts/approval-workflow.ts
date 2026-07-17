import type { PcrForecastApproval } from '@prisma/client'
import type { Session } from 'next-auth'

import { pcrForecastApprovalWorkflow } from '@/lib/approval/instances'
import {
  getChainLevelOrder,
  PCR_FORECAST_APPROVAL_CHAIN,
  type PcrApprovalLevel,
  type PcrForecastApprovalLevel
} from '@/lib/approval/registry'

export {
  PCR_FORECAST_APPROVAL_CHAIN,
  type PcrApprovalLevel,
  type PcrForecastApprovalLevel
} from '@/lib/approval/registry'

/** @deprecated Import dari registry — tetap diekspor untuk kompatibilitas. */
export const PCR_APPROVAL_LEVELS = PCR_FORECAST_APPROVAL_CHAIN.levels.map(item => ({
  level: item.level as PcrForecastApprovalLevel,
  stepOrder: item.stepOrder ?? 1,
  approverLabel: item.label
}))

export const PCR_APPROVAL_LEVEL_ORDER = getChainLevelOrder(PCR_FORECAST_APPROVAL_CHAIN) as PcrForecastApprovalLevel[]

const engine = pcrForecastApprovalWorkflow

function buildForecastApprovalStages(): Record<string, string> {
  const waitStages = Object.fromEntries(
    PCR_FORECAST_APPROVAL_CHAIN.levels.map(item => [`WAIT_${item.level}`, item.waitStageLabel ?? `Wait ${item.label}`])
  )

  return {
    ...waitStages,
    FULLY_APPROVED: 'Fully Approved',
    REJECTED: 'Rejected — revision required'
  }
}

export const FORECAST_APPROVAL_STAGES = buildForecastApprovalStages()

const LEGACY_WAIT_PM_PLM = 'Wait Project Manager & Plant Manager'
const LEGACY_WAIT_DIRECTORS = 'Wait Directors'

/** Map approval-stage filter value to statusBaPcr query (includes legacy combined labels). */
export function resolveApprovalStageStatusFilter(
  stage: string
): string | { in: string[] } {
  switch (stage) {
    case FORECAST_APPROVAL_STAGES.WAIT_PS:
      return stage
    case FORECAST_APPROVAL_STAGES.WAIT_PM:
      return { in: [stage, LEGACY_WAIT_PM_PLM] }
    case FORECAST_APPROVAL_STAGES.WAIT_PLM:
      return { in: [stage, LEGACY_WAIT_PM_PLM] }
    case FORECAST_APPROVAL_STAGES.WAIT_OD:
    case FORECAST_APPROVAL_STAGES.WAIT_FD:
    case FORECAST_APPROVAL_STAGES.WAIT_PD:
      return { in: [stage, LEGACY_WAIT_DIRECTORS] }
    default:
      return stage
  }
}

export function syncStatusBaPcr(approvals: PcrForecastApproval[], baPcrStatus: string): string | null {
  if (baPcrStatus === 'PENDING') return null
  if (baPcrStatus === 'REJECTED') return FORECAST_APPROVAL_STAGES.REJECTED

  const byLevel = new Map(approvals.map(row => [row.level, row.status]))

  for (const item of PCR_FORECAST_APPROVAL_CHAIN.levels) {
    if (byLevel.get(item.level) !== 'APPROVED') {
      return item.waitStageLabel ?? `Wait ${item.label}`
    }
  }

  return FORECAST_APPROVAL_STAGES.FULLY_APPROVED
}

export function areSubsequentPcrLevelsPending(
  approvals: PcrForecastApproval[],
  level: PcrApprovalLevel
): boolean {
  return engine.areSubsequentLevelsPending(approvals, level)
}

export function getCurrentPendingPcrLevel(approvals: PcrForecastApproval[]): PcrApprovalLevel | null {
  return engine.getCurrentPendingLevel(approvals) as PcrApprovalLevel | null
}

export function canActOnApproval(
  approvals: PcrForecastApproval[],
  level: PcrApprovalLevel,
  session: Session
): boolean {
  return engine.canActOnLevel(approvals, level, session)
}

export function canReviseApproval(
  approvals: PcrForecastApproval[],
  level: PcrApprovalLevel,
  session: Session
): boolean {
  return engine.canReviseLevel(approvals, level, session)
}

export function canApproveAtLevel(
  approvals: PcrForecastApproval[],
  level: PcrApprovalLevel,
  session: Session
): boolean {
  return engine.canApproveAtLevel(approvals, level, session)
}

export function canRejectAtLevel(
  approvals: PcrForecastApproval[],
  level: PcrApprovalLevel,
  session: Session
): boolean {
  return engine.canRejectAtLevel(approvals, level, session)
}

export function canRevokeApproval(
  approvals: PcrForecastApproval[],
  level: PcrApprovalLevel,
  session: Session
): boolean {
  return engine.canRevokeAtLevel(approvals, level, session)
}

export function isFullyApproved(approvals: PcrForecastApproval[]): boolean {
  return engine.isFullyApproved(approvals)
}

export function getPendingLevelsForSession(
  approvals: PcrForecastApproval[],
  session: Session
): PcrApprovalLevel[] {
  return engine.getActionableLevels(approvals, session) as PcrApprovalLevel[]
}
