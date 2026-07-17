/**
 * ACL / RBAC feature flag (server).
 * Set ACL_ENABLED=false di .env.local untuk bypass permission sementara.
 * Aktifkan lagi dengan ACL_ENABLED=true setelah role/permission siap.
 */
export function isAclEnabled(): boolean {
  const raw = process.env.ACL_ENABLED

  if (raw === undefined || raw === '') {
    return true
  }

  const normalized = raw.trim().toLowerCase()

  return normalized !== 'false' && normalized !== '0' && normalized !== 'no'
}
