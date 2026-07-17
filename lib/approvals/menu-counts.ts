import type { Session } from 'next-auth'

import { listBaApprovalQueue } from '@/lib/cannibal/service'
import { listForecastApprovalsPaginated } from '@/lib/forecasts/service'

export type ApprovalMenuCounts = {
  pcrRequest: number
  cannibalRequest: number
  total: number
}

/** Pending approval counts for nav badges — same filters as approval queue pages. */
export async function getApprovalMenuCounts(session: Session): Promise<ApprovalMenuCounts> {
  const [pcr, cannibal] = await Promise.all([
    listForecastApprovalsPaginated(session, {
      baPcrStatus: 'pending',
      page: 0,
      pageSize: 1
    }),
    listBaApprovalQueue(session, {}, { page: 0, pageSize: 1 })
  ])

  const pcrRequest = pcr.total
  const cannibalRequest = cannibal.total

  return {
    pcrRequest,
    cannibalRequest,
    total: pcrRequest + cannibalRequest
  }
}
