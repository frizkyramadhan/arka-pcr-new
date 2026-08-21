/**
 * Client labels for Cannibal Request By jabatan (mirrors lib/cannibal/requestor.ts).
 */
export const CANNIBAL_REQUEST_ROLES = ['SUPT_PRODUCTION', 'PJO', 'GM_OPERATION', 'GM_PLANT']

export const CANNIBAL_REQUEST_ROLE_OPTIONS = [
  { value: 'SUPT_PRODUCTION', label: 'Supt. Production' },
  { value: 'PJO', label: 'PJO' },
  { value: 'GM_OPERATION', label: 'GM Operation' },
  { value: 'GM_PLANT', label: 'GM Plant' }
]

export const CANNIBAL_REQUEST_ROLE_LABELS = Object.fromEntries(
  CANNIBAL_REQUEST_ROLE_OPTIONS.map(item => [item.value, item.label])
)

export function formatRequestorUser(user) {
  return user?.fullName || user?.username || '—'
}

export function getCannibalRequestRoleLabel(role) {
  if (!role) return '—'

  return CANNIBAL_REQUEST_ROLE_LABELS[role] ?? role
}
