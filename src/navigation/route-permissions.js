/**
 * Map route path → permission untuk page guard (ACL enabled).
 * Longest prefix match wins; null = authenticated user cukup.
 * `allOf` = semua permission wajib (halaman menu System: system.access + permission fitur).
 */
import {
  CANNIBAL_APPROVE_PERMISSIONS,
  FORECAST_APPROVE_PERMISSIONS
} from 'src/utils/approval-registry'

/** Halaman menu System: buka menu (`system.access`) + permission baca fitur. */
const systemPage = (prefix, permission) => ({ prefix, permission: null, allOf: ['system.access', permission] })

const ROUTE_PERMISSION_RULES = [
  { prefix: '/dashboard/cannibal', permission: 'cannibals.access' },
  { prefix: '/dashboard', permission: null },
  { prefix: '/dashboards/maintenance', permission: 'maintenance-dashboard.read' },
  { prefix: '/dashboards/maintenance-control', permission: 'maintenance-dashboard.read' },
  { prefix: '/dashboards/maintenance-control/print', permission: 'maintenance-dashboard.export' },
  { prefix: '/maintenance-plans', permission: 'maintenance-plan.read' },
  { prefix: '/maintenance-actuals', permission: 'maintenance-actual.read' },
  { prefix: '/maintenance-failures', permission: 'maintenance-actual.read' },
  { prefix: '/maintenance-types', permission: 'maintenance-type.read' },
  systemPage('/users', 'users.read'),
  systemPage('/roles', 'roles.read'),
  systemPage('/permissions', 'permissions.read'),
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
  { prefix: '/dashboards', permission: 'maintenance-dashboard.read' },
  systemPage('/admin/email-notifications', 'email-notifications.read'),
  systemPage('/admin/activity-logs', 'activity-logs.read'),
  systemPage('/admin/kpi-targets', 'kpi-target.read'),
  systemPage('/admin/api-tokens', 'api-tokens.read')
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
