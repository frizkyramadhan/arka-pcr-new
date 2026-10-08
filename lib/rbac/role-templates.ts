/**

 * Role template → permission codes (seed defaults) — jabatan organisasi ARKA PCR.
 *
 * FMS dashboard access follows spec section 2 (Sasaran Pengguna dan Hak Akses):
 * - Management (directors, OGM): dashboard view only, all sites via 000H
 * - Plant / Maintenance Manager (plant_manager, project_manager): view + drill-down + export, read-only data
 * - Supervisor / Foreman (plant_foreman): view detail + record actuals, update plan rows (pending reason)
 * - Planner / Admin (planner, plant_superintendent): create / edit maintenance data
 * - IT / System Admin (administrator): full administration, System menu

 */

import {

  CANNIBAL_APPROVE_PERMISSION_CODES,

  FORECAST_APPROVE_PERMISSION_CODES,

  FMS_DASHBOARD_ANALYSIS_CODES,

  FMS_DASHBOARD_VIEW_CODES,

  FMS_PERMISSION_CODES,

  FMS_READ_CODES,

  LOGISTICS_PERMISSION_CODES,

  MASTER_DATA_PERMISSION_CODES,

  PLANT_FOREMAN_PERMISSION_CODES,

  SYSTEM_MENU_PERMISSION_CODES

} from '@/lib/rbac/permission-catalog'



export type RoleTemplate = {

  name: string

  description: string

  permissionCodes: string[]

}



export const ROLE_TEMPLATES: RoleTemplate[] = [

  {

    name: 'administrator',

    description: 'Administrator — full access to all modules and approvals',

    permissionCodes: ['system.admin', 'cannibals.reopen', ...SYSTEM_MENU_PERMISSION_CODES]

  },

  {
    name: 'planner',
    description: 'Planner / Admin Maintenance — create and edit maintenance types, plans, actuals; dashboard + export',
    permissionCodes: [...FMS_PERMISSION_CODES, ...FMS_DASHBOARD_ANALYSIS_CODES, 'reports.access', 'exports.maintenance']
  },

  {

    name: 'plant_foreman',

    description: 'Plant Foreman / Supervisor — forecast, replacement, SOS, inspection, cannibal, reports',

    permissionCodes: [...PLANT_FOREMAN_PERMISSION_CODES]

  },

  {

    name: 'production_superintendent',

    description: 'Supt. Production — confirm Cannibal Request By (not Plant Superintendent / PS approver)',

    permissionCodes: ['cannibals.access']

  },

  {

    name: 'logistics',

    description: 'Logistics — fill and confirm cannibal BA logistic statement',

    permissionCodes: [...LOGISTICS_PERMISSION_CODES]

  },

  {

    name: 'plant_superintendent',

    description:

      'Plant Superintendent / Dept Head — operasional + master data + approve BA PCR & cannibal (project scope)',

    permissionCodes: [

      ...PLANT_FOREMAN_PERMISSION_CODES,

      ...MASTER_DATA_PERMISSION_CODES,

      ...FMS_PERMISSION_CODES,

      'forecasts.approve.PS',

      'cannibals.approve.PS'

    ]

  },

  {

    name: 'project_manager',

    description: 'Project Manager — view detail + approve BA PCR & cannibal; maintenance dashboard analysis (project scope)',

    permissionCodes: [

      'forecasts.access',

      'replacements.access',

      'cannibals.access',

      'forecasts.approve.PM',

      'cannibals.approve.PM',

      ...FMS_READ_CODES,

      ...FMS_DASHBOARD_ANALYSIS_CODES

    ]

  },

  {

    name: 'plant_manager',

    description:
      'Plant Manager (BA PCR PLM) / Plant General Manager (Cannibal PGM) — all projects via 000H',

    permissionCodes: [

      'forecasts.access',

      'cannibals.access',

      'forecasts.approve.PLM',

      'cannibals.approve.PGM',

      ...FMS_READ_CODES,

      ...FMS_DASHBOARD_ANALYSIS_CODES

    ]

  },

  {

    name: 'operational_gm',

    description: 'Operational General Manager — approve cannibal (all projects via 000H)',

    permissionCodes: ['cannibals.access', 'cannibals.approve.OGM', ...FMS_DASHBOARD_VIEW_CODES]

  },

  {

    name: 'operational_director',

    description: 'Operational Director — approve forecast & cannibal (all projects via 000H)',

    permissionCodes: [

      'forecasts.access',

      'cannibals.access',

      'forecasts.approve.OD',

      'cannibals.approve.OD',

      ...FMS_DASHBOARD_VIEW_CODES

    ]

  },

  {

    name: 'commercial_treasury_director',

    description: 'Commercial & Treasury Director — approve forecast BA PCR (all projects via 000H)',

    permissionCodes: ['forecasts.access', 'forecasts.approve.FD', ...FMS_DASHBOARD_VIEW_CODES]

  },

  {

    name: 'president_director',

    description: 'President Director — approve forecast BA PCR & cannibal BA (all projects via 000H)',

    permissionCodes: [
      'forecasts.access',
      'cannibals.access',
      'forecasts.approve.PD',
      'cannibals.approve.PD',
      ...FMS_DASHBOARD_VIEW_CODES
    ]

  }

]



/** Legacy role names — deactivated on seed, not synced. */

export const LEGACY_ROLE_NAMES = [

  'admin',

  'super_user',

  'viewer',

  'planner_pf',

  'approver_ps',

  'approver_pm',

  'approver_plm',

  'approver_od',

  'approver_fd',

  'approver_pd',

  'cannibal_l1',

  'cannibal_l2',

  'cannibal_l3'

] as const



/** Map legacy role → new job role (for user migration script). */

export const LEGACY_ROLE_MIGRATION_MAP: Record<string, string> = {

  admin: 'administrator',

  super_user: 'plant_foreman',

  viewer: 'plant_foreman',

  planner_pf: 'plant_foreman',

  approver_ps: 'plant_superintendent',

  approver_pm: 'project_manager',

  approver_plm: 'plant_manager',

  approver_od: 'operational_director',

  approver_fd: 'commercial_treasury_director',

  approver_pd: 'president_director',

  cannibal_l1: 'plant_manager',

  cannibal_l2: 'operational_gm',

  cannibal_l3: 'operational_director'

}



export const TEMPLATE_ROLE_NAMES = ROLE_TEMPLATES.map(item => item.name)



/** All active permission codes (for optional admin full-grant tooling). */

export const ADMIN_FULL_GRANT_CODES = [

  ...PLANT_FOREMAN_PERMISSION_CODES,

  ...MASTER_DATA_PERMISSION_CODES,

  ...FORECAST_APPROVE_PERMISSION_CODES,

  ...CANNIBAL_APPROVE_PERMISSION_CODES,

  ...FMS_PERMISSION_CODES,

  ...FMS_DASHBOARD_ANALYSIS_CODES,

  ...SYSTEM_MENU_PERMISSION_CODES

]


