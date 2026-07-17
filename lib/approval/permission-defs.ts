/**
 * Generate permission RBAC dari approval registry — hindari duplikasi manual.
 */
import type { ApprovalChainConfig } from '@/lib/approval/registry'
import type { PermissionDef, PermissionTier } from '@/lib/rbac/permission-catalog'

export function buildApprovePermissionDefs(
  chain: ApprovalChainConfig,
  tier: PermissionTier
): PermissionDef[] {
  return chain.levels.map(item => ({
    code: `${chain.permissionModule}.approve.${item.level}`,
    description: `Approve ${chain.documentLabel} — ${item.label}`,
    tier
  }))
}
