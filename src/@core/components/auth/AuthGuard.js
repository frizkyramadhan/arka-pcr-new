// ** React Imports
import { useEffect } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Hooks Import
import { useAuth } from 'src/hooks/useAuth'

import { toRouterPath } from 'src/utils/base-path'

const AuthGuard = props => {
  const { children, fallback } = props
  const auth = useAuth()
  const router = useRouter()
  useEffect(
    () => {
      if (!router.isReady || auth.loading || auth.isLoggingOut) {
        return
      }
      if (auth.user === null) {
        // Strip basePath / absolute URL so login returnUrl never double-prefixes on router.replace
        const returnUrl = toRouterPath(router.asPath, '/')
        if (returnUrl !== '/') {
          router.replace({
            pathname: '/login',
            query: { returnUrl }
          })
        } else {
          router.replace('/login')
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router.route, auth.loading, auth.user]
  )
  if (auth.loading || auth.isLoggingOut || auth.user === null) {
    return fallback
  }

  return <>{children}</>
}

export default AuthGuard
