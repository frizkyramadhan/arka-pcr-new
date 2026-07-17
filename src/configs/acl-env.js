/**
 * ACL feature flag (client + Edge middleware via NEXT_PUBLIC_).
 * Harus selaras dengan ACL_ENABLED di server.
 */
export function isAclEnabled() {
  const raw = process.env.NEXT_PUBLIC_ACL_ENABLED

  if (raw === undefined || raw === '') {
    return true
  }

  const normalized = String(raw).trim().toLowerCase()

  return normalized !== 'false' && normalized !== '0' && normalized !== 'no'
}
