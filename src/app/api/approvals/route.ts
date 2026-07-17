import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listBaApprovalQueue } from '@/lib/cannibal/service'
import { parseCannibalListFilters } from '@/lib/cannibal/list-filters'
import { requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const pagination = parseListPagination(searchParams)
  const filters = parseCannibalListFilters(searchParams)

  const result = await listBaApprovalQueue(session, filters, pagination)

  return NextResponse.json(result)
}
