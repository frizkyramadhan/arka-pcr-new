/**
 * Map route path → permission untuk page guard (ACL enabled).
 * Longest prefix match wins; null = authenticated user cukup.
 */
import {
  CANNIBAL_APPROVE_PERMISSIONS,
  FORECAST_APPROVE_PERMISSIONS
} from 'src/utils/approval-registry'

const ROUTE_PERMISSION_RULES = [
  { prefix: '/dashboard/cannibal', permission: 'cannibals.access' },
  { prefix: '/dashboard', permission: null },
  { prefix: '/dashboards/maintenance', permission: 'maintenance-plan.read' },
  { prefix: '/maintenance-plans', permission: 'maintenance-plan.read' },
  { prefix: '/maintenance-actuals', permission: 'maintenance-actual.read' },
  { prefix: '/maintenance-types', permission: 'maintenance-type.read' },
  { prefix: '/users', permission: 'users.access' },
  { prefix: '/roles', permission: 'roles.access' },
  { prefix: '/permissions', permission: 'permissions.access' },
  { prefix: '/approvals', permission: null, anyOf: FORECAST_APPROVE_PERMISSIONS },
  { prefix: '/cannibals-approvals', permission: null, anyOf: CANNIBAL_APPROVE_PERMISSIONS },
  { prefix: '/forecasts', permission: 'forecasts.access' },
  { prefix: '/replacements', permission: null, anyOf: ['replacements.access', 'units.access'] },
  { prefix: '/cannibals', permission: 'cannibals.access' },
  { prefix: '/components', permission: 'components.access' },
  { prefix: '/model-components', permission: 'model-components.access' },
  { prefix: '/hour-meters', permission: 'hour-meters.access' },
  { prefix: '/models', permission: 'units.access' },
  { prefix: '/units', permission: 'units.access' },
  { prefix: '/reports', permission: 'reports.access' },
  { prefix: '/dashboards', permission: 'maintenance-plan.read' },
  { prefix: '/admin/email-notifications', permission: 'system.admin' },
  { prefix: '/admin/activity-logs', permission: 'activity-logs.access' }
]

/** Resolve required permission(s) for pathname; undefined = no extra check. */
export function resolveRouteAccess(pathname) {
  if (!pathname) return undefined

  const normalized = pathname.split('?')[0]
  const matches = ROUTE_PERMISSION_RULES.filter(rule => normalized === rule.prefix || normalized.startsWith(`${rule.prefix}/`))
  if (matches.length === 0) return undefined

  matches.sort((a, b) => b.prefix.length - a.prefix.length)

  return matches[0]
}

export default resolveRouteAccess
