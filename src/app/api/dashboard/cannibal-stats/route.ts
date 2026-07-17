/**
 * GET /api/dashboard/cannibal-stats?year= — Cannibal BA pipeline KPIs.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getCannibalDashboardStats } from '@/lib/dashboard/cannibal-stats'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const yearParam = request.nextUrl.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : undefined

  const data = await getCannibalDashboardStats(session, Number.isNaN(year) ? undefined : year)

  return NextResponse.json(data)
}
