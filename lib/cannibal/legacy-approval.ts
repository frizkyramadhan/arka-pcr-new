/**
 * Legacy cannibal BA — detect OPEN records without new 5-level approval chain.
 * Used by admin/superuser manual seed action.
 */
import type { Session } from 'next-auth'

import { BA_APPROVAL_LEVELS } from '@/lib/cannibal/types'

export const LEGACY_APPROVAL_SEED_ROLES = ['administrator', 'superuser'] as const

export type LegacyApprovalSeedBa = {
  statusBa?: string
  approvals?: { level: string }[]
}

export function hasLegacyCannibalApprovalSeedRole(roles: string[]): boolean {
  return roles.some(role =>
    LEGACY_APPROVAL_SEED_ROLES.includes(
      String(role).toLowerCase() as (typeof LEGACY_APPROVAL_SEED_ROLES)[number]
    )
  )
}

export function hasLegacyCannibalApprovalSeedRoleFromSession(session: Session): boolean {
  return hasLegacyCannibalApprovalSeedRole((session.user?.roles as string[]) ?? [])
}

/** OPEN BA without PS–OD approval rows yet. */
export function isLegacyOpenUnapprovedBa(ba: LegacyApprovalSeedBa | null | undefined): boolean {
  if (!ba || ba.statusBa !== 'OPEN') return false

  const approvals = ba.approvals ?? []
  const hasNewLevels = BA_APPROVAL_LEVELS.some(level => approvals.some(row => row.level === level))

  return !hasNewLevels
}

export function showLegacyApprovalSeedAction(
  ba: LegacyApprovalSeedBa | null | undefined,
  roles: string[]
): boolean {
  return hasLegacyCannibalApprovalSeedRole(roles) && isLegacyOpenUnapprovedBa(ba)
}
