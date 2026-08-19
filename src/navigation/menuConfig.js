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
        title: 'Cannibal',
        path: '/dashboard/cannibal',
        icon: 'tabler:arrows-exchange',
        action: 'read',
        subject: 'cannibals'
      }
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
    title: 'Units',
    icon: 'tabler:truck',
    children: [
      { title: 'Units', path: '/units', icon: 'tabler:truck', action: 'read', subject: 'units' },
      { title: 'Forecast', path: '/forecasts', icon: 'tabler:chart-dots', action: 'read', subject: 'forecasts' },
      { title: 'Models', path: '/models', icon: 'tabler:box-model', action: 'read', subject: 'units' },
      { title: 'Components', path: '/components', icon: 'tabler:puzzle', action: 'read', subject: 'components' },
      { title: 'Hour Meters', path: '/hour-meters', icon: 'tabler:gauge', action: 'read', subject: 'hour-meters' }
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
      { title: 'Cannibal', path: '/reports/cannibals', icon: 'tabler:arrows-exchange', action: 'read', subject: 'reports' },
      { title: 'Inspection', path: '/reports/inspections', icon: 'tabler:clipboard-check', action: 'read', subject: 'reports' },
      { title: 'Condition', path: '/reports/conditions', icon: 'tabler:activity', action: 'read', subject: 'reports' }
    ]
  },
  {
    title: 'Administration',
    icon: 'tabler:users',
    children: [
      { title: 'Users', path: '/users', icon: 'tabler:user', action: 'read', subject: 'users' },
      { title: 'Roles', path: '/roles', icon: 'tabler:shield', action: 'read', subject: 'roles' },
      { title: 'Permissions', path: '/permissions', icon: 'tabler:key', action: 'read', subject: 'permissions' },
      {
        title: 'Email Notifications',
        path: '/admin/email-notifications',
        icon: 'tabler:mail',
        action: 'read',
        subject: 'system-admin'
      },
      {
        title: 'Activity Logs',
        path: '/admin/activity-logs',
        icon: 'tabler:history',
        action: 'read',
        subject: 'system-admin'
      }
    ]
  }
]

export default menuConfig
