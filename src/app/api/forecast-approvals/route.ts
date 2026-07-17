import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listForecastApprovalsPaginated } from '@/lib/forecasts/service'
import { requireSession } from '@/lib/utils/api-auth'
import { isHeadOffice } from '@/lib/utils/project-scope'
import { parseListPagination } from '@/lib/utils/list-pagination'

function resolvePlanPeriodFilter(searchParams: URLSearchParams): string | null {
  const planMonth = searchParams.get('planMonth')?.trim()
  if (planMonth && /^\d{4}-\d{2}$/.test(planMonth)) {
    return `${planMonth}-01`
  }

  const planPeriod = searchParams.get('planPeriod')?.trim()
  if (!planPeriod) return null

  if (/^\d{4}-\d{2}$/.test(planPeriod)) {
    return `${planPeriod}-01`
  }

  return planPeriod
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const pagination = parseListPagination(searchParams)

  const result = await listForecastApprovalsPaginated(session, {
    ...pagination,
    projectCode: isHeadOffice(session) ? searchParams.get('projectCode') : null,
    quarter: searchParams.get('quarter'),
    baPcrStatus: searchParams.get('baPcrStatus'),
    statusBaPcr: searchParams.get('statusBaPcr'),
    unitNo: searchParams.get('unitNo'),
    planPeriod: resolvePlanPeriodFilter(searchParams)
  })

  return NextResponse.json(result)
}
