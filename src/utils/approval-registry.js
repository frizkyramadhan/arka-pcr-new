/**
 * Client-side approval registry helpers — re-export dari lib/approval/registry.
 */
import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  getChainApprovePermissionCodes,
  getChainLevelLabels,
  getChainLevelOrder,
  getChainProjectScopedLevels,
  getForecastApprovalChain,
  PCR_FORECAST_APPROVAL_CHAIN,
  PCR_FORECAST_WARRANTY_APPROVAL_CHAIN
} from '@/lib/approval/registry'

export {
  CANNIBAL_BA_APPROVAL_CHAIN,
  getForecastApprovalChain,
  inferForecastIsWarranty,
  PCR_FORECAST_APPROVAL_CHAIN,
  PCR_FORECAST_WARRANTY_APPROVAL_CHAIN
} from '@/lib/approval/registry'

export const PCR_APPROVAL_LEVEL_ORDER = getChainLevelOrder(PCR_FORECAST_APPROVAL_CHAIN)

export const PCR_WARRANTY_APPROVAL_LEVEL_ORDER = getChainLevelOrder(PCR_FORECAST_WARRANTY_APPROVAL_CHAIN)

export const CANNIBAL_APPROVAL_LEVEL_ORDER = getChainLevelOrder(CANNIBAL_BA_APPROVAL_CHAIN)

export const FORECAST_APPROVE_PERMISSIONS = getChainApprovePermissionCodes(PCR_FORECAST_APPROVAL_CHAIN)

export const CANNIBAL_APPROVE_PERMISSIONS = getChainApprovePermissionCodes(CANNIBAL_BA_APPROVAL_CHAIN)

export const FORECAST_APPROVAL_LEVEL_LABELS = getChainLevelLabels(PCR_FORECAST_APPROVAL_CHAIN)

export const CANNIBAL_APPROVAL_LEVEL_LABELS = getChainLevelLabels(CANNIBAL_BA_APPROVAL_CHAIN)

export const CANNIBAL_PROJECT_SCOPED_LEVELS = getChainProjectScopedLevels(CANNIBAL_BA_APPROVAL_CHAIN)

/** Opsi filter queue approval PCR — derived dari registry. */
export function buildForecastApprovalStageFilterOptions() {
  return [
    { value: '', label: 'All stages' },
    ...PCR_FORECAST_APPROVAL_CHAIN.levels.map(item => ({
      value: item.waitStageLabel ?? `Wait ${item.label}`,
      label: item.waitStageLabel?.replace(/^Wait /, 'Wait ') ?? `Wait ${item.label}`
    }))
  ]
}

export function getForecastApprovalLevelOrder(isWarranty = false) {
  return getChainLevelOrder(getForecastApprovalChain(isWarranty))
}
