/**
 * GET /api/dashboard/cannibal-achievement?year= — Achievement Cannibal per project × month.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getCannibalAchievementByProjectMonth } from '@/lib/dashboard/cannibal-achievement'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const yearParam = request.nextUrl.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : undefined

  const data = await getCannibalAchievementByProjectMonth(session, Number.isNaN(year) ? undefined : year)

  return NextResponse.json(data)
}
