/**
 * Katalog permission ARKA PCR — konvensi modul.aksi (seed + grouping UI Roles).
 */
import { buildApprovePermissionDefs } from '@/lib/approval/permission-defs'
import { CANNIBAL_BA_APPROVAL_CHAIN, getChainApprovePermissionCodes, getChainLevelOrder, PCR_FORECAST_APPROVAL_CHAIN } from '@/lib/approval/registry'

export type PermissionTier =

  | 'system'

  | 'operations'

  | 'master'

  | 'approval_forecast'

  | 'approval_cannibal'

  | 'reports'



export type PermissionDef = {

  code: string

  description: string

  tier: PermissionTier

}



export const PERMISSION_CATALOG: PermissionDef[] = [

  // System menu — `system.access` shows the menu; every page in it also needs its own permission

  { code: 'system.access', description: 'Open the System menu (each System page also needs its own permission)', tier: 'system' },
  { code: 'users.read', description: 'View users', tier: 'system' },
  { code: 'users.create', description: 'Create users', tier: 'system' },
  { code: 'users.update', description: 'Update users (profile, roles, project scope, password)', tier: 'system' },
  { code: 'users.delete', description: 'Delete users', tier: 'system' },
  { code: 'roles.read', description: 'View roles', tier: 'system' },
  { code: 'roles.create', description: 'Create roles', tier: 'system' },
  { code: 'roles.update', description: 'Update roles and their permissions', tier: 'system' },
  { code: 'roles.delete', description: 'Delete roles', tier: 'system' },
  { code: 'permissions.read', description: 'View permissions', tier: 'system' },
  { code: 'permissions.create', description: 'Create permissions', tier: 'system' },
  { code: 'permissions.update', description: 'Update permissions and their roles', tier: 'system' },
  { code: 'permissions.delete', description: 'Delete permissions', tier: 'system' },
  { code: 'email-notifications.read', description: 'View email notification status and template previews', tier: 'system' },
  { code: 'email-notifications.send', description: 'Send trial notification emails', tier: 'system' },
  { code: 'email-notifications.update', description: 'Turn email sending on or off', tier: 'system' },
  { code: 'activity-logs.read', description: 'View activity logs (audit trail)', tier: 'system' },

  { code: 'units.access', description: 'Access unit / fleet list', tier: 'system' },

  { code: 'system.admin', description: 'Full administrator bypass', tier: 'system' },
  { code: 'kpi-target.read', description: 'View KPI targets', tier: 'system' },
  { code: 'kpi-target.create', description: 'Create KPI targets', tier: 'system' },
  { code: 'kpi-target.update', description: 'Update KPI targets', tier: 'system' },
  { code: 'kpi-target.delete', description: 'Delete KPI targets', tier: 'system' },
  { code: 'api-tokens.read', description: 'View API tokens for other applications', tier: 'system' },
  { code: 'api-tokens.create', description: 'Create API tokens (token acts as the chosen user)', tier: 'system' },
  { code: 'api-tokens.revoke', description: 'Revoke API tokens', tier: 'system' },

  // FMS — Fundamental Maintenance System (FMS-style names)
  // Dashboard (spec section 2): view = cards/trend; drilldown = detail lists + API details; export = Excel + Print/PDF
  { code: 'maintenance-dashboard.read', description: 'View maintenance dashboards (KPI, trend, KPI API)', tier: 'operations' },
  { code: 'maintenance-dashboard.drilldown', description: 'Open dashboard drill-down lists (and the detail API)', tier: 'operations' },
  { code: 'maintenance-dashboard.export', description: 'Export the maintenance control dashboard (Excel, Print/PDF)', tier: 'operations' },
  { code: 'maintenance-type.read', description: 'View maintenance types', tier: 'operations' },
  { code: 'maintenance-type.create', description: 'Create maintenance types', tier: 'operations' },
  { code: 'maintenance-type.update', description: 'Update maintenance types', tier: 'operations' },
  { code: 'maintenance-type.delete', description: 'Delete maintenance types', tier: 'operations' },
  { code: 'maintenance-plan.read', description: 'View maintenance plans', tier: 'operations' },
  { code: 'maintenance-plan.create', description: 'Create maintenance plans', tier: 'operations' },
  { code: 'maintenance-plan.update', description: 'Change or remove existing maintenance plan dates', tier: 'operations' },
  { code: 'maintenance-plan.delete', description: 'Delete maintenance plans', tier: 'operations' },
  { code: 'maintenance-actual.read', description: 'View maintenance actuals', tier: 'operations' },
  { code: 'maintenance-actual.create', description: 'Create maintenance actuals', tier: 'operations' },
  { code: 'maintenance-actual.update', description: 'Update maintenance actuals', tier: 'operations' },
  { code: 'maintenance-actual.delete', description: 'Delete maintenance actuals', tier: 'operations' },


  // Components

  { code: 'components.access', description: 'View components master', tier: 'master' },

  { code: 'components.create', description: 'Create / import components', tier: 'master' },

  { code: 'components.update', description: 'Update components', tier: 'master' },

  { code: 'components.delete', description: 'Delete components', tier: 'master' },



  // Model components

  { code: 'model-components.access', description: 'View model-component mapping', tier: 'master' },

  { code: 'model-components.create', description: 'Create model-component', tier: 'master' },

  { code: 'model-components.update', description: 'Update model-component', tier: 'master' },

  { code: 'model-components.delete', description: 'Delete model-component', tier: 'master' },



  // Hour meters

  { code: 'hour-meters.access', description: 'View hour meters', tier: 'master' },

  { code: 'hour-meters.create', description: 'Create hour meter entry', tier: 'master' },

  { code: 'hour-meters.update', description: 'Update hour meter entry', tier: 'master' },

  { code: 'hour-meters.delete', description: 'Delete hour meter entry', tier: 'master' },

  { code: 'hour-meters.import', description: 'Import hour meters', tier: 'master' },



  // Replacements

  { code: 'replacements.access', description: 'View replacements', tier: 'operations' },

  { code: 'replacements.create', description: 'Create replacement', tier: 'operations' },

  { code: 'replacements.update', description: 'Update replacement / report', tier: 'operations' },

  { code: 'replacements.delete', description: 'Delete replacement work order', tier: 'operations' },

  { code: 'replacements.close', description: 'Close replacement WO', tier: 'operations' },

  { code: 'replacements.edit.close', description: 'Edit closed replacement WO without reopen', tier: 'operations' },



  // SOS

  { code: 'sos.access', description: 'View SOS records', tier: 'operations' },

  { code: 'sos.create', description: 'Create SOS record', tier: 'operations' },

  { code: 'sos.update', description: 'Update SOS record', tier: 'operations' },

  { code: 'sos.delete', description: 'Delete SOS record', tier: 'operations' },



  // Inspections

  { code: 'inspections.access', description: 'View inspections', tier: 'operations' },

  { code: 'inspections.create', description: 'Create inspection', tier: 'operations' },

  { code: 'inspections.update', description: 'Update inspection', tier: 'operations' },

  { code: 'inspections.delete', description: 'Delete inspection', tier: 'operations' },



  // Conditions

  { code: 'conditions.access', description: 'View condition monitoring', tier: 'operations' },

  { code: 'conditions.create', description: 'Create / update condition', tier: 'operations' },



  // Forecasts

  { code: 'forecasts.access', description: 'View PCR forecasts', tier: 'operations' },

  { code: 'forecasts.create', description: 'Generate / refresh forecasts', tier: 'operations' },

  { code: 'forecasts.update', description: 'Update / close forecasts', tier: 'operations' },

  { code: 'forecasts.delete', description: 'Delete PCR forecast', tier: 'operations' },

  { code: 'forecasts.convert', description: 'Convert forecast to replacement', tier: 'operations' },

  { code: 'forecasts.export', description: 'Export forecasts', tier: 'operations' },

  { code: 'forecasts.submit', description: 'Submit forecast BA PCR (Plant Foreman)', tier: 'operations' },

  ...buildApprovePermissionDefs(PCR_FORECAST_APPROVAL_CHAIN, 'approval_forecast'),

  // Cannibal BA — plant actions use cannibals.update; logistics uses cannibals.update.logistic

  { code: 'cannibals.access', description: 'View cannibal BA', tier: 'operations' },

  { code: 'cannibals.create', description: 'Create cannibal BA', tier: 'operations' },

  {
    code: 'cannibals.update',
    description: 'Update cannibal BA (plant edit, submit, execution record, close, cancel)',
    tier: 'operations'
  },

  { code: 'cannibals.update.logistic', description: 'Update cannibal BA logistic statement and submit to approval', tier: 'operations' },

  { code: 'cannibals.reopen', description: 'Reopen expired cannibal BA and restart the 5-day SLA', tier: 'operations' },

  ...buildApprovePermissionDefs(CANNIBAL_BA_APPROVAL_CHAIN, 'approval_cannibal'),

  // Reports & exports

  { code: 'reports.access', description: 'Access reports menu', tier: 'reports' },

  { code: 'exports.conditions', description: 'Export conditions', tier: 'reports' },

  { code: 'exports.forecasts', description: 'Export forecasts', tier: 'reports' },

  { code: 'exports.sos', description: 'Export SOS', tier: 'reports' },

  { code: 'exports.pcr', description: 'Export PCR', tier: 'reports' },

  { code: 'exports.inspections', description: 'Export inspections', tier: 'reports' },

  { code: 'exports.cannibal', description: 'Export cannibal BA', tier: 'reports' },

  { code: 'exports.maintenance_plans', description: 'Export maintenance plans to Excel', tier: 'reports' },

  { code: 'imports.maintenance_plans', description: 'Import maintenance plans from Excel', tier: 'reports' },

  { code: 'exports.maintenance_actuals', description: 'Export maintenance actuals and findings to Excel', tier: 'reports' },

  { code: 'imports.maintenance_actuals', description: 'Import maintenance actuals and findings from Excel', tier: 'reports' }

]



/** Deprecated permission codes — soft-deactivated on seed. */

export const LEGACY_PERMISSION_CODES = [

  'system.super',

  'cannibals.approve.L1',

  'cannibals.approve.L2',

  'cannibals.approve.L3',

  'cannibals.approve.PLM',

  // Consolidated into cannibals.update

  'cannibals.submit',

  'cannibals.submit.plant',

  'cannibals.update.execution',

  'cannibals.close',

  'cannibals.cancel',

  // Consolidated into cannibals.update.logistic

  'cannibals.confirm.logistic',

  // Split into System menu permissions (2026-10-07), see PERMISSION_REPLACEMENTS
  'users.access',
  'roles.access',
  'permissions.access',
  'activity-logs.access',

  // Renamed onto exports.* / imports.* (2026-10-09). exports.maintenance is removed, not replaced.
  'maintenance-plan.export',
  'maintenance-plan.import',
  'maintenance-actual.export',
  'maintenance-actual.import',
  'export.maintenance_plans',
  'import.maintenance_plans',
  'export.maintenance_actuals',
  'import.maintenance_actuals',
  'exports.maintenance'

] as const

/** Retired codes hidden from the permissions list. Other legacy codes stay inactive but visible. */
export const REMOVED_PERMISSION_CODES = [
  'exports.maintenance',
  'export.maintenance_plans',
  'import.maintenance_plans',
  'export.maintenance_actuals',
  'import.maintenance_actuals'
] as const

/**
 * Deprecated code → codes that replace it. On seed, every role holding the old code gets the new codes
 * before the old one is deactivated, so custom roles (e.g. an auditor role made in the UI) keep their access.
 */
export const PERMISSION_REPLACEMENTS: Record<string, string[]> = {
  'users.access': ['system.access', 'users.read', 'users.create', 'users.update', 'users.delete'],
  'roles.access': ['system.access', 'roles.read', 'roles.create', 'roles.update', 'roles.delete'],
  'permissions.access': ['system.access', 'permissions.read', 'permissions.create', 'permissions.update', 'permissions.delete'],
  'activity-logs.access': ['system.access', 'activity-logs.read'],
  'maintenance-plan.export': ['exports.maintenance_plans'],
  'maintenance-plan.import': ['imports.maintenance_plans'],
  'maintenance-actual.export': ['exports.maintenance_actuals'],
  'maintenance-actual.import': ['imports.maintenance_actuals'],
  'export.maintenance_plans': ['exports.maintenance_plans'],
  'import.maintenance_plans': ['imports.maintenance_plans'],
  'export.maintenance_actuals': ['exports.maintenance_actuals'],
  'import.maintenance_actuals': ['imports.maintenance_actuals']
}



export const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map(item => item.code)



/** Permission codes ending with .access */

export const ACCESS_PERMISSION_CODES = ALL_PERMISSION_CODES.filter(code => code.endsWith('.access'))



/** Shared report exports. Planner-only FMS Excel is excluded so foreman and superintendent do not inherit it. */
const PLANNER_ONLY_EXPORT_CODES = new Set(['exports.maintenance_plans', 'exports.maintenance_actuals'])

export const EXPORT_PERMISSION_CODES = ALL_PERMISSION_CODES.filter(
  code => code.startsWith('exports.') && !PLANNER_ONLY_EXPORT_CODES.has(code)
)



/** Every System menu permission (administrator template; system.admin bypasses them anyway). */
export const SYSTEM_MENU_PERMISSION_CODES = PERMISSION_CATALOG.filter(
  item => item.tier === 'system' && item.code !== 'system.admin' && item.code !== 'units.access'
).map(item => item.code)

/** Spec section 2 — Management: dashboard view only (KPI status + trend, all sites, MTD/YTD). */
export const FMS_DASHBOARD_VIEW_CODES = ['maintenance-dashboard.read'] as const

/** Spec section 2 — Manager and above: view + drill-down + export (Excel, Print/PDF). */
export const FMS_DASHBOARD_ANALYSIS_CODES = [
  'maintenance-dashboard.read',
  'maintenance-dashboard.drilldown',
  'maintenance-dashboard.export'
] as const

/** Read-only maintenance data (Plant / Maintenance Manager). */
export const FMS_READ_CODES = ['maintenance-type.read', 'maintenance-plan.read', 'maintenance-actual.read'] as const

/**
 * Supervisor / Foreman: record actuals and findings, change or remove existing plan dates
 * (and the pending reason on those dates). Cannot add dates, delete a plan, or edit master data.
 */
export const FMS_SUPERVISOR_CODES = [
  ...FMS_READ_CODES,
  'maintenance-plan.update',
  'maintenance-actual.create',
  'maintenance-actual.update'
] as const

/** FMS Fundamental Maintenance — full CRUD (Planner / Admin, Plant Superintendent). */
export const FMS_PERMISSION_CODES = [
  'maintenance-type.read',
  'maintenance-type.create',
  'maintenance-type.update',
  'maintenance-type.delete',
  'maintenance-plan.read',
  'maintenance-plan.create',
  'maintenance-plan.update',
  'maintenance-plan.delete',
  'maintenance-actual.read',
  'maintenance-actual.create',
  'maintenance-actual.update',
  'maintenance-actual.delete'
] as const

/** Plant Foreman / Supervisor — operasional lapangan. */

export const PLANT_FOREMAN_PERMISSION_CODES = [

  'units.access',

  'conditions.access',

  'conditions.create',

  'forecasts.access',

  'forecasts.create',

  'forecasts.update',

  'forecasts.delete',

  'forecasts.convert',

  'forecasts.export',

  'forecasts.submit',

  'replacements.access',

  'replacements.create',

  'replacements.update',

  'replacements.delete',

  'replacements.close',

  'replacements.edit.close',

  'sos.access',

  'sos.create',

  'sos.update',

  'sos.delete',

  'inspections.access',

  'inspections.create',

  'inspections.update',

  'inspections.delete',

  'cannibals.access',

  'cannibals.create',

  'cannibals.update',

  'reports.access',

  ...EXPORT_PERMISSION_CODES,

  ...FMS_SUPERVISOR_CODES,

  ...FMS_DASHBOARD_ANALYSIS_CODES

] as const



/** Logistics — cannibal BA logistic statement only. */

export const LOGISTICS_PERMISSION_CODES = [

  'cannibals.access',

  'cannibals.update.logistic'

] as const



/** Master data CRUD (superintendent layer). */

export const MASTER_DATA_PERMISSION_CODES = [

  'components.access',

  'components.create',

  'components.update',

  'components.delete',

  'model-components.access',

  'model-components.create',

  'model-components.update',

  'model-components.delete',

  'hour-meters.access',

  'hour-meters.create',

  'hour-meters.update',

  'hour-meters.delete',

  'hour-meters.import'

] as const



export const CANNIBAL_APPROVE_PERMISSION_CODES = getChainApprovePermissionCodes(
  CANNIBAL_BA_APPROVAL_CHAIN
) as readonly string[]

export const FORECAST_APPROVE_PERMISSION_CODES = getChainApprovePermissionCodes(
  PCR_FORECAST_APPROVAL_CHAIN
) as readonly string[]



/** @deprecated Use PLANT_FOREMAN_PERMISSION_CODES */

export const SUPER_USER_PERMISSION_CODES = [...PLANT_FOREMAN_PERMISSION_CODES]



export const PERMISSION_TIER_LABELS: Record<PermissionTier, string> = {

  system: 'System & Administration',

  operations: 'Operations',

  master: 'Master Data',

  approval_forecast: 'Forecast BA PCR Approval',

  approval_cannibal: 'Cannibal BA Approval',

  reports: 'Reports & Exports'

}



export function getPermissionTier(code: string): PermissionTier {

  const found = PERMISSION_CATALOG.find(item => item.code === code)



  return found?.tier ?? 'operations'

}


