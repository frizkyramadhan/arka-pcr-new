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

/** Level yang dibatasi project scope user (bukan 000H). Scope = project BA, bukan unit REMOVE/INSTALL. */
export const CANNIBAL_PROJECT_SCOPED_LEVELS = getChainProjectScopedLevels(
  CANNIBAL_BA_APPROVAL_CHAIN
) as CannibalBaApprovalLevel[]

/** Project untuk gate approval + recipient PS/PM — hanya `ba.projectCode`. */
export function getCannibalApprovalProjectCode(ba: unknown): string {
  if (!ba || typeof ba !== 'object') return ''
  const code = (ba as { projectCode?: unknown }).projectCode

  return String(code ?? '').trim()
}

export function getCannibalApprovalLabel(level: string): string {
  return CANNIBAL_APPROVAL_LEVEL_LABELS[level as CannibalBaApprovalLevel] ?? level
}
