/**

 * Shared BA PCR & Cannibal approval — permissions, pending lookup.

 */

import { findActionableForecastApproval } from 'src/utils/forecast-approval-workflow'
import {
  CANNIBAL_APPROVE_PERMISSIONS,
  CANNIBAL_APPROVAL_LEVEL_LABELS,
  FORECAST_APPROVE_PERMISSIONS,
  FORECAST_APPROVAL_LEVEL_LABELS
} from 'src/utils/approval-registry'

export {
  CANNIBAL_APPROVE_PERMISSIONS,
  CANNIBAL_APPROVAL_LEVEL_LABELS,
  FORECAST_APPROVE_PERMISSIONS,
  FORECAST_APPROVAL_LEVEL_LABELS
} from 'src/utils/approval-registry'

export const permissionToLevel = code => code.replace('forecasts.approve.', '')

export function getApproveLevelsFromCan(can) {
  return FORECAST_APPROVE_PERMISSIONS.filter(code => can(code)).map(code =>
    code.replace('forecasts.approve.', '')
  )
}

export function findPendingApprovalForUser(forecast, approveLevels, can) {
  if (!forecast?.approvals?.length || !approveLevels?.length) return null

  if (typeof can === 'function') {
    return findActionableForecastApproval(forecast, approveLevels, can)
  }

  return forecast.approvals.find(item => approveLevels.includes(item.level) && item.status === 'PENDING') ?? null
}
