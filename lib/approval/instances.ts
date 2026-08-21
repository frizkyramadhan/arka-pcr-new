/**
 * Pre-built workflow engines — import ini dari modul domain (forecasts/cannibal).
 */
import { CANNIBAL_BA_APPROVAL_CHAIN, PCR_FORECAST_APPROVAL_CHAIN } from '@/lib/approval/registry'
import { createApprovalWorkflow } from '@/lib/approval/workflow-engine'

export const pcrForecastApprovalWorkflow = createApprovalWorkflow(PCR_FORECAST_APPROVAL_CHAIN)

export const cannibalBaApprovalWorkflow = createApprovalWorkflow(CANNIBAL_BA_APPROVAL_CHAIN)
