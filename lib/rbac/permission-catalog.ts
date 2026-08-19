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

  // System

  { code: 'users.access', description: 'Access user management', tier: 'system' },

  { code: 'roles.access', description: 'Access role management', tier: 'system' },

  { code: 'permissions.access', description: 'Access permission management', tier: 'system' },

  { code: 'units.access', description: 'Access unit / fleet list', tier: 'system' },

  { code: 'system.admin', description: 'Full administrator bypass', tier: 'system' },



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

  ...buildApprovePermissionDefs(CANNIBAL_BA_APPROVAL_CHAIN, 'approval_cannibal'),

  // Reports & exports

  { code: 'reports.access', description: 'Access reports menu', tier: 'reports' },

  { code: 'exports.conditions', description: 'Export conditions', tier: 'reports' },

  { code: 'exports.forecasts', description: 'Export forecasts', tier: 'reports' },

  { code: 'exports.sos', description: 'Export SOS', tier: 'reports' },

  { code: 'exports.pcr', description: 'Export PCR', tier: 'reports' },

  { code: 'exports.inspections', description: 'Export inspections', tier: 'reports' },

  { code: 'exports.cannibal', description: 'Export cannibal BA', tier: 'reports' }

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

  'cannibals.confirm.logistic'

] as const



export const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map(item => item.code)



/** Permission codes ending with .access */

export const ACCESS_PERMISSION_CODES = ALL_PERMISSION_CODES.filter(code => code.endsWith('.access'))



export const EXPORT_PERMISSION_CODES = ALL_PERMISSION_CODES.filter(code => code.startsWith('exports.'))



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

  ...EXPORT_PERMISSION_CODES

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


