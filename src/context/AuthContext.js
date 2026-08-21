// ** React Imports
import { createContext, useEffect, useRef, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Next Auth
import { signIn, signOut, useSession } from 'next-auth/react'

// ** Defaults
const defaultProvider = {
  user: null,
  loading: true,
  isLoggingOut: false,
  setUser: () => null,
  setLoading: () => Boolean,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  can: () => true,
  canAny: () => true
}

const AuthContext = createContext(defaultProvider)

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(defaultProvider.user)
  const [loading, setLoading] = useState(defaultProvider.loading)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const loggingOutRef = useRef(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (loggingOutRef.current) {
      return
    }

    if (status === 'loading') {
      setLoading(true)

      return
    }

    if (session?.user) {
      setUser({
        id: session.user.id,
        fullName: session.user.name,
        projectCodes: session.user.projectCodes ?? [],
        roles: session.user.roles ?? [],
        permissions: session.user.permissions ?? []
      })
      setLoading(false)

      return
    }

    setUser(null)
    setLoading(false)
  }, [session, status])

  const can = permissionCode => {
    const permissions = user?.permissions ?? []
    if (permissions.includes('system.admin')) return true

    return permissions.includes(permissionCode)
  }

  const canAny = permissionCodes => {
    if (!Array.isArray(permissionCodes)) return false

    return permissionCodes.some(code => can(code))
  }

  const handleLogin = async (params, errorCallback) => {
    const result = await signIn('credentials', {
      username: params.username,
      password: params.password,
      redirect: false
    })

    if (result?.error) {
      if (errorCallback) errorCallback(result)

      return
    }

    const returnUrl = router.query.returnUrl
    const redirectURL = returnUrl && returnUrl !== '/' ? returnUrl : '/dashboard'
    router.replace(redirectURL)
  }

  const handleLogout = async () => {
    loggingOutRef.current = true
    setIsLoggingOut(true)

    // Do not setUser(null) here — AuthGuard would redirect to /login?returnUrl=… before the session cookie is cleared.
    await signOut({ callbackUrl: '/login', redirect: true })

    // Fallback when redirect does not navigate (e.g. blocked popup).
    if (typeof window !== 'undefined') {
      window.location.replace('/login')
    }
  }

  const values = {
    user,
    loading,
    isLoggingOut,
    setUser,
    setLoading,
    login: handleLogin,
    logout: handleLogout,
    can,
    canAny
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
