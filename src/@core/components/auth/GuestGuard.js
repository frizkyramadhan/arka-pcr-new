// ** React Imports
import { useEffect } from 'react'

// ** Next Import
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

const GuestGuard = props => {
  const { children, fallback } = props
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady || status === 'loading') {
      return
    }

    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.route, status])

  if (status === 'loading' || status === 'authenticated') {
    return fallback
  }

  return <>{children}</>
}

export default GuestGuard
