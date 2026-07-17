/**

 * Role template → permission codes (seed defaults) — 9 jabatan organisasi ARKA PCR.

 */

import {

  CANNIBAL_APPROVE_PERMISSION_CODES,

  FORECAST_APPROVE_PERMISSION_CODES,

  LOGISTICS_PERMISSION_CODES,

  MASTER_DATA_PERMISSION_CODES,

  PLANT_FOREMAN_PERMISSION_CODES

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

    permissionCodes: ['system.admin']

  },

  {

    name: 'plant_foreman',

    description: 'Plant Foreman / Supervisor — forecast, replacement, SOS, inspection, cannibal, reports',

    permissionCodes: [...PLANT_FOREMAN_PERMISSION_CODES]

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

      'forecasts.approve.PS',

      'cannibals.approve.PS'

    ]

  },

  {

    name: 'project_manager',

    description: 'Project Manager — view detail + approve BA PCR & cannibal (project scope)',

    permissionCodes: [

      'forecasts.access',

      'replacements.access',

      'cannibals.access',

      'forecasts.approve.PM',

      'cannibals.approve.PM'

    ]

  },

  {

    name: 'plant_manager',

    description: 'Plant Manager — approve forecast & cannibal (all projects via 000H)',

    permissionCodes: [

      'forecasts.access',

      'cannibals.access',

      'forecasts.approve.PLM',

      'cannibals.approve.PLM'

    ]

  },

  {

    name: 'operational_gm',

    description: 'Operational General Manager — approve cannibal (all projects via 000H)',

    permissionCodes: ['cannibals.access', 'cannibals.approve.OGM']

  },

  {

    name: 'operational_director',

    description: 'Operational Director — approve forecast & cannibal (all projects via 000H)',

    permissionCodes: [

      'forecasts.access',

      'cannibals.access',

      'forecasts.approve.OD',

      'cannibals.approve.OD'

    ]

  },

  {

    name: 'commercial_treasury_director',

    description: 'Commercial & Treasury Director — approve forecast BA PCR (all projects via 000H)',

    permissionCodes: ['forecasts.access', 'forecasts.approve.FD']

  },

  {

    name: 'president_director',

    description: 'President Director — approve forecast BA PCR (all projects via 000H)',

    permissionCodes: ['forecasts.access', 'forecasts.approve.PD']

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

  'users.access',

  'roles.access',

  'permissions.access'

]


