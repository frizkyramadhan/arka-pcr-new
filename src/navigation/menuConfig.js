/**
 * Konfigurasi menu navigasi ARKA PCR (vertical & horizontal).
 * `action` + `subject` dipakai CanViewNavLink / CanViewNavGroup saat ACL enabled.
 */
const menuConfig = [
  {
    sectionTitle: 'ARKA PCR'
  },
  {
    title: 'Dashboard',
    icon: 'tabler:layout-dashboard',
    auth: false,
    children: [
      { title: 'PCR', path: '/dashboard', icon: 'tabler:layout-dashboard', auth: false },
      {
        title: 'Maintenance Control',
        path: '/dashboards/maintenance-control',
        icon: 'tabler:gauge',
        action: 'read',
        subject: 'maintenance-dashboard'
      },
      {
        title: 'Cannibal',
        path: '/dashboard/cannibal',
        icon: 'tabler:arrows-exchange',
        action: 'read',
        subject: 'cannibals'
      }
    ]
  },
  {
    title: 'Units',
    icon: 'tabler:truck',
    children: [
      { title: 'Units', path: '/units', icon: 'tabler:truck', action: 'read', subject: 'units' },
      { title: 'Models', path: '/models', icon: 'tabler:box-model', action: 'read', subject: 'units' },
      { title: 'Components', path: '/components', icon: 'tabler:puzzle', action: 'read', subject: 'components' },
      { title: 'Hour Meters', path: '/hour-meters', icon: 'tabler:gauge', action: 'read', subject: 'hour-meters' }
    ]
  },
  {
    title: 'Replacements',
    icon: 'tabler:arrows-left-right',
    children: [
      { title: 'Forecast', path: '/forecasts', icon: 'tabler:chart-dots', action: 'read', subject: 'forecasts' },
      { title: 'Actual', path: '/replacements', icon: 'tabler:tool', action: 'read', subject: 'replacements' }
    ]
  },
  {
    title: 'Cannibals',
    icon: 'tabler:files',
    path: '/cannibals',
    action: 'read',
    subject: 'cannibals'
  },
  {
    title: 'Maintenance',
    icon: 'tabler:tool',
    children: [
      {
        title: 'Type',
        path: '/maintenance-types',
        icon: 'tabler:category',
        action: 'read',
        subject: 'maintenance-type'
      },
      {
        title: 'Plan',
        path: '/maintenance-plans',
        icon: 'tabler:calendar-event',
        action: 'read',
        subject: 'maintenance-plan'
      },
      {
        title: 'Actual',
        path: '/maintenance-actuals/list',
        icon: 'tabler:clipboard-check',
        action: 'read',
        subject: 'maintenance-actual'
      },
      {
        title: 'Failure',
        path: '/maintenance-failures',
        icon: 'tabler:alert-triangle',
        action: 'read',
        subject: 'maintenance-actual'
      }
    ]
  },
  {
    title: 'Reports',
    icon: 'tabler:report-analytics',
    action: 'read',
    subject: 'reports',
    children: [
      {
        title: 'Replacements',
        icon: 'tabler:arrows-left-right',
        children: [
          { title: 'Forecast', path: '/reports/forecasts', icon: 'tabler:chart-line', action: 'read', subject: 'reports' },
          { title: 'Actual', path: '/reports/pcr', icon: 'tabler:tool', action: 'read', subject: 'reports' }
        ]
      },
      { title: 'SOS', path: '/reports/sos', icon: 'tabler:droplet', action: 'read', subject: 'reports' },
      {
        title: 'Maintenance',
        path: '/reports/maintenance',
        icon: 'tabler:calendar-event',
        action: 'read',
        subject: 'reports'
      },
      { title: 'Cannibal', path: '/reports/cannibals', icon: 'tabler:arrows-exchange', action: 'read', subject: 'reports' },
      { title: 'Inspection', path: '/reports/inspections', icon: 'tabler:clipboard-check', action: 'read', subject: 'reports' },
      { title: 'Condition', path: '/reports/conditions', icon: 'tabler:activity', action: 'read', subject: 'reports' }
    ]
  },
  {
    title: 'Approval',
    icon: 'tabler:checkbox',
    children: [
      { title: 'PCR Request', path: '/approvals', icon: 'tabler:file-check', action: 'read', subject: 'forecast-approvals' },
      {
        title: 'Cannibal Request',
        path: '/cannibals-approvals',
        icon: 'tabler:arrows-left-right',
        action: 'read',
        subject: 'cannibals-approvals'
      }
    ]
  },
  {
    title: 'System',
    icon: 'tabler:settings',

    // Group shown only with `system.access`; each child still needs its own feature permission
    action: 'read',
    subject: 'system',
    children: [
      { title: 'Users', path: '/users', icon: 'tabler:user', action: 'read', subject: 'users' },
      { title: 'Roles', path: '/roles', icon: 'tabler:shield', action: 'read', subject: 'roles' },
      { title: 'Permissions', path: '/permissions', icon: 'tabler:key', action: 'read', subject: 'permissions' },
      {
        title: 'Email Notifications',
        path: '/admin/email-notifications',
        icon: 'tabler:mail',
        action: 'read',
        subject: 'email-notifications'
      },
      {
        title: 'KPI Targets',
        path: '/admin/kpi-targets',
        icon: 'tabler:target-arrow',
        action: 'read',
        subject: 'kpi-target'
      },
      {
        title: 'API Tokens',
        path: '/admin/api-tokens',
        icon: 'tabler:api',
        action: 'read',
        subject: 'api-tokens'
      },
      {
        title: 'Activity Logs',
        path: '/admin/activity-logs',
        icon: 'tabler:history',
        action: 'read',
        subject: 'activity-logs'
      }
    ]
  }
]

export default menuConfig
