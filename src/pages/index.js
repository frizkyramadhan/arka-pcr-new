// ** React Imports
import { useEffect } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Component Import
import Spinner from 'src/@core/components/spinner'

/** Root path — redirect ke halaman dashboard PCR. */
const HomeRedirectPage = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return <Spinner />
}

HomeRedirectPage.authGuard = true

export default HomeRedirectPage
