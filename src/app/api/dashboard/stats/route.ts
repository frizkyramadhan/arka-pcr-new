import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getDashboardStats } from '@/lib/dashboard/stats'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const yearParam = request.nextUrl.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : undefined

  const stats = await getDashboardStats(session, Number.isNaN(year) ? undefined : year)

  return NextResponse.json(stats)
}
