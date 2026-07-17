// ** React Imports
import { useEffect, useMemo } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Context Imports
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Config Import
import { buildAbilityFromPermissions, canAccessPage } from 'src/configs/acl'
import { resolveRouteAccess } from 'src/navigation/route-permissions'

// ** Component Import
import NotAuthorized from 'src/pages/401'
import Spinner from 'src/@core/components/spinner'
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Util Import
import getHomeRoute from 'src/layouts/components/acl/getHomeRoute'

const AclGuard = props => {
  const { aclAbilities, children, guestGuard = false, authGuard = true } = props

  const auth = useAuth()
  const router = useRouter()

  const permissions = useMemo(() => auth.user?.permissions ?? [], [auth.user?.permissions])
  const ability = useMemo(() => buildAbilityFromPermissions(permissions), [permissions])

  const routeAccess = useMemo(() => resolveRouteAccess(router.pathname), [router.pathname])

  const pageAllowed = useMemo(
    () => canAccessPage(permissions, aclAbilities, routeAccess),
    [permissions, aclAbilities, routeAccess]
  )

  useEffect(() => {
    if (auth.user && !guestGuard && router.route === '/') {
      const homeRoute = getHomeRoute(permissions)
      router.replace(homeRoute)
    }
  }, [auth.user, guestGuard, router, permissions])

  if (guestGuard || router.route === '/404' || router.route === '/500' || !authGuard) {
    if (auth.user) {
      return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
    }

    return <>{children}</>
  }

  if (!auth.user) {
    return <Spinner />
  }

  if (!pageAllowed) {
    return (
      <BlankLayout>
        <NotAuthorized />
      </BlankLayout>
    )
  }

  if (router.route === '/') {
    return <Spinner />
  }

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
}

export default AclGuard
