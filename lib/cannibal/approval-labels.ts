/**
 * Label jabatan approval Cannibal BA — derived dari approval registry.
 */
import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  getChainLevelLabels,
  getChainProjectScopedLevels,
  type CannibalBaApprovalLevel
} from '@/lib/approval/registry'

export const CANNIBAL_APPROVAL_LEVEL_LABELS = getChainLevelLabels(
  CANNIBAL_BA_APPROVAL_CHAIN
) as Record<CannibalBaApprovalLevel, string>

/** Level yang dibatasi project scope user (bukan 000H). */
export const CANNIBAL_PROJECT_SCOPED_LEVELS = getChainProjectScopedLevels(
  CANNIBAL_BA_APPROVAL_CHAIN
) as CannibalBaApprovalLevel[]

export function getCannibalApprovalLabel(level: string): string {
  return CANNIBAL_APPROVAL_LEVEL_LABELS[level as CannibalBaApprovalLevel] ?? level
}
