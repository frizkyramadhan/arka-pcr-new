/**
 * Client-side project scope helpers (mirror lib/utils/project-scope.ts).
 */

export const HEAD_OFFICE_CODE = '000H'

export function getProjectCodes(user) {
  if (Array.isArray(user?.projectCodes) && user.projectCodes.length > 0) {
    return user.projectCodes
  }

  return []
}

export function hasAllProjectsAccess(user) {
  return getProjectCodes(user).includes(HEAD_OFFICE_CODE)
}

export function canAccessProject(user, projectCode) {
  if (hasAllProjectsAccess(user)) return true

  return getProjectCodes(user).includes(projectCode)
}
