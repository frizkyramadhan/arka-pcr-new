import type { Session } from 'next-auth'

import type { FleetUnit } from '@/types/fleet-api'

export type ProjectScopeWhere =
  | Record<string, never>
  | { projectCode: string }
  | { projectCode: { in: string[] } }

/** Head office: sees all projects when assigned this code. */
export const HEAD_OFFICE_CODE = '000H'

export function getSessionProjectCodes(session: Session): string[] {
  const fromSession = session.user.projectCodes
  if (Array.isArray(fromSession) && fromSession.length > 0) {
    return fromSession
  }

  return []
}

function isSystemAdmin(session: Session): boolean {
  const permissions = session.user.permissions
  return Array.isArray(permissions) && permissions.includes('system.admin')
}

export function isSystemAdminSession(session: Session): boolean {
  return isSystemAdmin(session)
}

export function hasAllProjectsAccess(session: Session): boolean {
  return getSessionProjectCodes(session).includes(HEAD_OFFICE_CODE)
}

/** @deprecated Use hasAllProjectsAccess — kept for existing imports. */
export function isHeadOffice(session: Session): boolean {
  return hasAllProjectsAccess(session)
}

export function canAccessProject(session: Session, projectCode: string): boolean {
  if (hasAllProjectsAccess(session)) return true

  return getSessionProjectCodes(session).includes(projectCode)
}

export function filterByProject(units: FleetUnit[], session: Session): FleetUnit[] {
  if (hasAllProjectsAccess(session)) return units

  const allowed = new Set(getSessionProjectCodes(session))
  if (allowed.size === 0) return []

  return units.filter(unit => allowed.has(unit.project_code))
}

export function getPrismaProjectFilter(session: Session): ProjectScopeWhere {
  if (hasAllProjectsAccess(session) || isSystemAdmin(session)) return {}

  const codes = getSessionProjectCodes(session)
  if (codes.length === 0) return { projectCode: '__NONE__' }
  if (codes.length === 1) return { projectCode: codes[0] }

  return { projectCode: { in: codes } }
}

/** Merge optional UI filter with session scope (for list endpoints). */
export function resolveProjectFilter(
  session: Session,
  requestedProjectCode?: string | null
): { projectCode?: string | { in: string[] } } {
  const scope = getPrismaProjectFilter(session)

  if ('projectCode' in scope && typeof scope.projectCode === 'object' && 'in' in scope.projectCode) {
    const allowed = scope.projectCode.in as string[]
    if (requestedProjectCode) {
      return allowed.includes(requestedProjectCode)
        ? { projectCode: requestedProjectCode }
        : { projectCode: '__NONE__' }
    }

    return scope
  }

  if ('projectCode' in scope && typeof scope.projectCode === 'string') {
    if (requestedProjectCode && requestedProjectCode !== scope.projectCode) {
      return { projectCode: '__NONE__' }
    }

    return requestedProjectCode ? { projectCode: requestedProjectCode } : scope
  }

  if ((hasAllProjectsAccess(session) || isSystemAdmin(session)) && requestedProjectCode) {
    return { projectCode: requestedProjectCode }
  }

  return scope
}
