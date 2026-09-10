/**
 * Pre-built workflow engines — import ini dari modul domain (forecasts/cannibal).
 */
import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  normalizeForecastChainInput,
  PCR_FORECAST_APPROVAL_CHAIN,
  PCR_FORECAST_SHORT_APPROVAL_CHAIN,
  usesShortForecastApprovalChain,
  type ForecastChainInput
} from '@/lib/approval/registry'
import { createApprovalWorkflow } from '@/lib/approval/workflow-engine'

export const pcrForecastApprovalWorkflow = createApprovalWorkflow(PCR_FORECAST_APPROVAL_CHAIN)

export const pcrForecastShortApprovalWorkflow = createApprovalWorkflow(PCR_FORECAST_SHORT_APPROVAL_CHAIN)

/** @deprecated alias */
export const pcrForecastWarrantyApprovalWorkflow = pcrForecastShortApprovalWorkflow

export const cannibalBaApprovalWorkflow = createApprovalWorkflow(CANNIBAL_BA_APPROVAL_CHAIN)

export function getPcrForecastApprovalWorkflow(input: ForecastChainInput = false) {
  const ctx = normalizeForecastChainInput(input)

  return usesShortForecastApprovalChain(ctx) ? pcrForecastShortApprovalWorkflow : pcrForecastApprovalWorkflow
}
