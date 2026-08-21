/**
 * Cannibal Request By jabatan — client-safe (no Prisma).
 * Form codes map to RBAC roles; Supt. Production is not plant_superintendent.
 */
export const CANNIBAL_REQUEST_ROLES = ['SUPT_PRODUCTION', 'PJO', 'GM_OPERATION', 'GM_PLANT'] as const

export type CannibalRequestRole = (typeof CANNIBAL_REQUEST_ROLES)[number]

export const CANNIBAL_REQUEST_ROLE_LABELS: Record<CannibalRequestRole, string> = {
  SUPT_PRODUCTION: 'Supt. Production',
  PJO: 'PJO',
  GM_OPERATION: 'GM Operation',
  GM_PLANT: 'GM Plant'
}

export const CANNIBAL_REQUEST_ROLE_TO_RBAC: Record<CannibalRequestRole, string> = {
  SUPT_PRODUCTION: 'production_superintendent',
  PJO: 'project_manager',
  GM_OPERATION: 'operational_gm',
  GM_PLANT: 'plant_manager'
}

export function isCannibalRequestRole(value: unknown): value is CannibalRequestRole {
  return typeof value === 'string' && (CANNIBAL_REQUEST_ROLES as readonly string[]).includes(value)
}

export function rbacRoleForRequestRole(role: CannibalRequestRole): string {
  return CANNIBAL_REQUEST_ROLE_TO_RBAC[role]
}

export function isRequestorAssignmentComplete(data: {
  cannibalRequestRole?: string | null
  requestedBy?: number | null
}): boolean {
  return isCannibalRequestRole(data.cannibalRequestRole) && Boolean(data.requestedBy && data.requestedBy > 0)
}
