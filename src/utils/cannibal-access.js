/**
 * Cannibal UI access helpers — logistics role and permission checks.
 */
const LOGISTICS_ROLE_NAMES = ['logistics', 'logistic', 'admin_logistic']

const LOGISTIC_PERMISSION_CODES = ['cannibals.update.logistic']

export function hasLogisticsRole(roles = []) {
  return roles.some(role => {
    const name = String(role).toLowerCase()

    return LOGISTICS_ROLE_NAMES.includes(name) || name.includes('logistic')
  })
}

export function canEditCannibalLogistic({ can, roles = [] }) {
  return LOGISTIC_PERMISSION_CODES.some(code => can(code)) || hasLogisticsRole(roles)
}
