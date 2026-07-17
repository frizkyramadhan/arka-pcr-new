import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApprovalMenuCounts } from '@/lib/approvals/menu-counts'
import { requireSession } from '@/lib/utils/api-auth'

/** GET — pending PCR & cannibal approval counts for current user (nav badges). */
export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const counts = await getApprovalMenuCounts(session)

  return NextResponse.json(counts)
}
