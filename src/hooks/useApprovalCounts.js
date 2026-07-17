/**
 * Fetch pending approval counts for nav menu badges.
 * Refreshes on mount and after each client-side route change.
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import arkaApi from 'src/utils/arka-api'

const EMPTY_COUNTS = { pcrRequest: 0, cannibalRequest: 0, total: 0 }

export default function useApprovalCounts() {
  const [counts, setCounts] = useState(null)
  const router = useRouter()

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await arkaApi.get('/approval-counts')
      setCounts({
        pcrRequest: data?.pcrRequest ?? 0,
        cannibalRequest: data?.cannibalRequest ?? 0,
        total: data?.total ?? 0
      })
    } catch {
      setCounts(EMPTY_COUNTS)
    }
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    const handleRouteChange = () => {
      fetchCounts()
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events, fetchCounts])

  return counts
}
