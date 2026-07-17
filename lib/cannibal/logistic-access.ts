/**
 * Server/client shared — who may fill or save the cannibal logistic statement.
 */
export const LOGISTIC_STATEMENT_PERMISSION_CODES = ['cannibals.update.logistic'] as const

const LOGISTICS_ROLE_NAMES = ['logistics', 'logistic', 'admin_logistic']

export function hasLogisticsRole(roles: string[] = []): boolean {
  return roles.some(role => {
    const name = String(role).toLowerCase()

    return LOGISTICS_ROLE_NAMES.includes(name) || name.includes('logistic')
  })
}

export function canManageCannibalLogisticStatement(
  permissions: string[],
  roles: string[] = []
): boolean {
  if (permissions.includes('system.admin')) return true

  return (
    LOGISTIC_STATEMENT_PERMISSION_CODES.some(code => permissions.includes(code)) ||
    hasLogisticsRole(roles)
  )
}
