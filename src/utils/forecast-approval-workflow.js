/**
 * Client-side BA PCR approval workflow — mirrors lib/forecasts/approval-workflow.ts.
 */
import {
  buildForecastApprovalStageFilterOptions,
  PCR_APPROVAL_LEVEL_ORDER,
  PCR_FORECAST_APPROVAL_CHAIN
} from 'src/utils/approval-registry'

export { PCR_APPROVAL_LEVEL_ORDER } from 'src/utils/approval-registry'

function approvalStatusMap(approvals) {
  return new Map((approvals ?? []).map(row => [row.level, row.status]))
}

export function getForecastFlowStageLabel(forecast) {
  const baPcrStatus = forecast?.baPcrStatus

  if (!baPcrStatus || baPcrStatus === 'PENDING') return 'Not submitted'
  if (baPcrStatus === 'REJECTED') return 'Rejected — revision required'
  if (forecast?.statusBaPcr) return forecast.statusBaPcr

  const approvals = forecast?.approvals ?? []
  const byLevel = approvalStatusMap(approvals)

  for (const item of PCR_FORECAST_APPROVAL_CHAIN.levels) {
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

function arePriorForecastLevelsApproved(approvals, level) {
  const byLevel = approvalStatusMap(approvals)
  const index = PCR_APPROVAL_LEVEL_ORDER.indexOf(level)
  if (index <= 0) return true

  for (let i = 0; i < index; i += 1) {
    if (byLevel.get(PCR_APPROVAL_LEVEL_ORDER[i]) !== 'APPROVED') return false
  }

  return true
}

/** True when every level after `level` is still PENDING. */
export function areSubsequentForecastLevelsPending(approvals, level) {
  const byLevel = approvalStatusMap(approvals)
  const index = PCR_APPROVAL_LEVEL_ORDER.indexOf(level)

  for (let i = index + 1; i < PCR_APPROVAL_LEVEL_ORDER.length; i += 1) {
    if (byLevel.get(PCR_APPROVAL_LEVEL_ORDER[i]) !== 'PENDING') return false
  }

  return true
}

/** First pending level whose prior job titles are all approved. */
export function getCurrentPendingForecastLevel(approvals) {
  for (const level of PCR_APPROVAL_LEVEL_ORDER) {
    const byLevel = approvalStatusMap(approvals)
    if (byLevel.get(level) === 'PENDING' && arePriorForecastLevelsApproved(approvals, level)) {
      return level
    }
  }

  return null
}

export function isForecastApprovalStepReady(approvals, level) {
  const byLevel = approvalStatusMap(approvals)
  if (byLevel.get(level) !== 'PENDING') return false

  return arePriorForecastLevelsApproved(approvals, level)
}

export function canActOnForecastApproval(approvals, level, can) {
  if (!can(`forecasts.approve.${level}`)) return false

  return isForecastApprovalStepReady(approvals, level)
}

export function canReviseForecastApproval(approvals, level, can) {
  if (!can(`forecasts.approve.${level}`)) return false

  const row = (approvals ?? []).find(item => item.level === level)
  if (row?.status !== 'APPROVED') return false

  return areSubsequentForecastLevelsPending(approvals, level)
}

export function canApproveForecastLevel(approvals, level, can) {
  if (!can(`forecasts.approve.${level}`)) return false

  const status = approvalStatusMap(approvals).get(level)
  if (status === 'PENDING') return isForecastApprovalStepReady(approvals, level)
  if (status === 'APPROVED') return canReviseForecastApproval(approvals, level, can)

  return false
}

export function canRejectForecastLevel(approvals, level, can) {
  if (!can(`forecasts.approve.${level}`)) return false

  const status = approvalStatusMap(approvals).get(level)
  if (status === 'PENDING') return isForecastApprovalStepReady(approvals, level)
  if (status === 'APPROVED') return areSubsequentForecastLevelsPending(approvals, level)

  return false
}

export function findActionableForecastApproval(forecast, approveLevels, can) {
  const approvals = forecast?.approvals ?? []
  if (!approvals.length) return null

  const currentLevel = getCurrentPendingForecastLevel(approvals)
  if (currentLevel) {
    const levelAllowed = !approveLevels?.length || approveLevels.includes(currentLevel)
    if (levelAllowed && canActOnForecastApproval(approvals, currentLevel, can)) {
      const approval = approvals.find(item => item.level === currentLevel && item.status === 'PENDING')
      if (approval) return { ...approval, actionMode: 'pending' }
    }
  }

  for (let i = PCR_APPROVAL_LEVEL_ORDER.length - 1; i >= 0; i -= 1) {
    const level = PCR_APPROVAL_LEVEL_ORDER[i]
    const levelAllowed = !approveLevels?.length || approveLevels.includes(level)
    if (levelAllowed && canReviseForecastApproval(approvals, level, can)) {
      const approval = approvals.find(item => item.level === level && item.status === 'APPROVED')
      if (approval) return { ...approval, actionMode: 'revise' }
    }
  }

  return null
}

/** Level display: APPROVED | REVISABLE | REJECTED | ACTIVE | WAITING */
export function getForecastLevelFlowStatus(approvals, level) {
  const row = (approvals ?? []).find(item => item.level === level)
  if (!row) return 'WAITING'
  if (row.status === 'APPROVED') {
    if (areSubsequentForecastLevelsPending(approvals, level)) return 'REVISABLE'

    return 'APPROVED'
  }
  if (row.status === 'REJECTED') return 'REJECTED'

  const currentLevel = getCurrentPendingForecastLevel(approvals)
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
  const currentLevel = getCurrentPendingForecastLevel(approvals)
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
