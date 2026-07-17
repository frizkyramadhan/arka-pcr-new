/**
 * Client RBAC helper — cek permission dari session user.
 */
import { useCallback } from 'react'

import { useAuth } from 'src/hooks/useAuth'
import { isAclEnabled } from 'src/configs/acl-env'

export function useCan() {
  const auth = useAuth()

  const can = useCallback(
    permissionCode => {
      if (!isAclEnabled()) return true

      const permissions = auth.user?.permissions ?? []
      if (permissions.includes('system.admin')) return true

      return permissions.includes(permissionCode)
    },
    [auth.user?.permissions]
  )

  const canAny = useCallback(
    permissionCodes => {
      if (!Array.isArray(permissionCodes)) return false

      return permissionCodes.some(code => can(code))
    },
    [can]
  )

  return { can, canAny, permissions: auth.user?.permissions ?? [], roles: auth.user?.roles ?? [] }
}

export default useCan
