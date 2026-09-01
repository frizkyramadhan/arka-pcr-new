/**
 * Client-side BA PCR approval workflow — mirrors lib/forecasts/approval-workflow.ts.
 */
import {
  buildForecastApprovalStageFilterOptions,
  getForecastApprovalChain,
  getForecastApprovalLevelOrder,
  inferForecastIsWarranty,
  PCR_APPROVAL_LEVEL_ORDER
} from 'src/utils/approval-registry'

export { PCR_APPROVAL_LEVEL_ORDER, getForecastApprovalLevelOrder } from 'src/utils/approval-registry'

function approvalStatusMap(approvals) {
  return new Map((approvals ?? []).map(row => [row.level, row.status]))
}

function resolveIsWarranty(forecastOrFlag, approvals) {
  if (typeof forecastOrFlag === 'boolean') return forecastOrFlag
  if (forecastOrFlag && typeof forecastOrFlag === 'object' && 'isWarranty' in forecastOrFlag) {
    return Boolean(forecastOrFlag.isWarranty)
  }

  return inferForecastIsWarranty(approvals)
}

function levelOrderFor(forecastOrFlag, approvals) {
  return getForecastApprovalLevelOrder(resolveIsWarranty(forecastOrFlag, approvals))
}

function chainFor(forecastOrFlag, approvals) {
  return getForecastApprovalChain(resolveIsWarranty(forecastOrFlag, approvals))
}

export function getForecastFlowStageLabel(forecast) {
  const baPcrStatus = forecast?.baPcrStatus

  if (!baPcrStatus || baPcrStatus === 'PENDING') return 'Not submitted'
  if (baPcrStatus === 'REJECTED') return 'Rejected — revision required'
  if (forecast?.statusBaPcr) return forecast.statusBaPcr

  const approvals = forecast?.approvals ?? []
  const byLevel = approvalStatusMap(approvals)
  const chain = chainFor(forecast, approvals)

  for (const item of chain.levels) {
    if (byLevel.get(item.level) !== 'APPROVED') {
      return item.waitStageLabel ?? `Wait ${item.label}`
    }
  }

  return 'Fully Approved'
}

/** statusBaPcr values from syncStatusBaPcr — used by approval queue filters. */
export const FORECAST_APPROVAL_STAGE_FILTER_OPTIONS = buildForecastApprovalStageFilterOptions()

export const FORECAST_BA_PCR_STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
]

function arePriorForecastLevelsApproved(approvals, level, forecastOrFlag) {
  const byLevel = approvalStatusMap(approvals)
  const order = levelOrderFor(forecastOrFlag, approvals)
  const index = order.indexOf(level)
  if (index <= 0) return true

  for (let i = 0; i < index; i += 1) {
    if (byLevel.get(order[i]) !== 'APPROVED') return false
  }

  return true
}

/** True when every level after `level` is still PENDING. */
export function areSubsequentForecastLevelsPending(approvals, level, forecastOrFlag) {
  const byLevel = approvalStatusMap(approvals)
  const order = levelOrderFor(forecastOrFlag, approvals)
  const index = order.indexOf(level)

  for (let i = index + 1; i < order.length; i += 1) {
    if (byLevel.get(order[i]) !== 'PENDING') return false
  }

  return true
}

/** First pending level whose prior job titles are all approved. */
export function getCurrentPendingForecastLevel(approvals, forecastOrFlag) {
  const order = levelOrderFor(forecastOrFlag, approvals)
  const byLevel = approvalStatusMap(approvals)

  for (const level of order) {
    if (byLevel.get(level) === 'PENDING' && arePriorForecastLevelsApproved(approvals, level, forecastOrFlag)) {
      return level
    }
  }

  return null
}

export function isForecastApprovalStepReady(approvals, level, forecastOrFlag) {
  const byLevel = approvalStatusMap(approvals)
  if (byLevel.get(level) !== 'PENDING') return false

  return arePriorForecastLevelsApproved(approvals, level, forecastOrFlag)
}

export function canActOnForecastApproval(approvals, level, can, forecastOrFlag) {
  if (!can(`forecasts.approve.${level}`)) return false

  return isForecastApprovalStepReady(approvals, level, forecastOrFlag)
}

export function canReviseForecastApproval(approvals, level, can, forecastOrFlag) {
  if (!can(`forecasts.approve.${level}`)) return false

  const row = (approvals ?? []).find(item => item.level === level)
  if (row?.status !== 'APPROVED') return false

  return areSubsequentForecastLevelsPending(approvals, level, forecastOrFlag)
}

export function canApproveForecastLevel(approvals, level, can, forecastOrFlag) {
  if (!can(`forecasts.approve.${level}`)) return false

  const status = approvalStatusMap(approvals).get(level)
  if (status === 'PENDING') return isForecastApprovalStepReady(approvals, level, forecastOrFlag)
  if (status === 'APPROVED') return canReviseForecastApproval(approvals, level, can, forecastOrFlag)

  return false
}

export function canRejectForecastLevel(approvals, level, can, forecastOrFlag) {
  if (!can(`forecasts.approve.${level}`)) return false

  const status = approvalStatusMap(approvals).get(level)
  if (status === 'PENDING') return isForecastApprovalStepReady(approvals, level, forecastOrFlag)
  if (status === 'APPROVED') return areSubsequentForecastLevelsPending(approvals, level, forecastOrFlag)

  return false
}

export function findActionableForecastApproval(forecast, approveLevels, can) {
  const approvals = forecast?.approvals ?? []
  if (!approvals.length) return null

  const currentLevel = getCurrentPendingForecastLevel(approvals, forecast)
  if (currentLevel) {
    const levelAllowed = !approveLevels?.length || approveLevels.includes(currentLevel)
    if (levelAllowed && canActOnForecastApproval(approvals, currentLevel, can, forecast)) {
      const approval = approvals.find(item => item.level === currentLevel && item.status === 'PENDING')
      if (approval) return { ...approval, actionMode: 'pending' }
    }
  }

  const order = levelOrderFor(forecast, approvals)
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const level = order[i]
    const levelAllowed = !approveLevels?.length || approveLevels.includes(level)
    if (levelAllowed && canReviseForecastApproval(approvals, level, can, forecast)) {
      const approval = approvals.find(item => item.level === level && item.status === 'APPROVED')
      if (approval) return { ...approval, actionMode: 'revise' }
    }
  }

  return null
}

/** Level display: APPROVED | REVISABLE | REJECTED | ACTIVE | WAITING */
export function getForecastLevelFlowStatus(approvals, level, forecastOrFlag) {
  const row = (approvals ?? []).find(item => item.level === level)
  if (!row) return 'WAITING'
  if (row.status === 'APPROVED') {
    if (areSubsequentForecastLevelsPending(approvals, level, forecastOrFlag)) return 'REVISABLE'

    return 'APPROVED'
  }
  if (row.status === 'REJECTED') return 'REJECTED'

  const currentLevel = getCurrentPendingForecastLevel(approvals, forecastOrFlag)
  if (currentLevel === level) return 'ACTIVE'

  return 'WAITING'
}

export function getForecastLevelFlowLabel(status) {
  switch (status) {
    case 'APPROVED':
      return 'APPROVED'
    case 'REVISABLE':
      return 'CAN REVISE'
    case 'REJECTED':
      return 'REJECTED'
    case 'ACTIVE':
      return 'IN REVIEW'
    default:
      return 'WAITING'
  }
}

function formatBaPcrStatusShort(baPcrStatus) {
  switch (baPcrStatus) {
    case 'SUBMITTED':
    case 'IN_REVIEW':
      return 'In Review'
    case 'APPROVED':
      return 'Approved'
    case 'REJECTED':
      return 'Rejected'
    default:
      return baPcrStatus?.replace(/_/g, ' ') ?? ''
  }
}

/** Status label for forecast list grid — reflects BA PCR approval when active. */
export function getForecastListStatusLabel(row) {
  const forecastStatus = row?.status ?? row?.forecastStatus
  const baPcrStatus = row?.baPcrStatus

  if (forecastStatus && forecastStatus !== 'OPEN') {
    return forecastStatus
  }

  if (!baPcrStatus || baPcrStatus === 'PENDING') {
    return forecastStatus ?? 'OPEN'
  }

  return `BA: ${formatBaPcrStatusShort(baPcrStatus)}`
}

/** MUI chip color for forecast list status. */
export function getForecastListStatusChipColor(row) {
  const forecastStatus = row?.status ?? row?.forecastStatus
  const baPcrStatus = row?.baPcrStatus

  if (forecastStatus === 'CLOSED') return 'secondary'
  if (!baPcrStatus || baPcrStatus === 'PENDING') {
    return forecastStatus === 'OPEN' ? 'info' : 'secondary'
  }
  if (baPcrStatus === 'APPROVED') return 'success'
  if (baPcrStatus === 'REJECTED') return 'error'

  return 'warning'
}

/** Tooltip for BA in review — who must approve next. */
export function getForecastListStatusTooltip(row) {
  const baPcrStatus = row?.baPcrStatus
  if (!['SUBMITTED', 'IN_REVIEW'].includes(baPcrStatus)) return null

  const approvals = row?.approvals ?? []
  const currentLevel = getCurrentPendingForecastLevel(approvals, row)
  if (currentLevel) {
    const approval = approvals.find(item => item.level === currentLevel)

    return `Waiting approval: ${approval?.approverLabel ?? currentLevel}`
  }

  const stage = row?.statusBaPcr ?? getForecastFlowStageLabel(row)
  if (stage?.startsWith('Wait ')) {
    return `Waiting approval: ${stage.slice(5)}`
  }

  return null
}
