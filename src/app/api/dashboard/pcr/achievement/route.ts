/**
 * GET /api/dashboard/pcr/achievement?year= — PCR forecast achievement (relocated).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getAchievementByProjectMonth } from '@/lib/dashboard/achievement'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const yearParam = request.nextUrl.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : undefined

  const data = await getAchievementByProjectMonth(session, Number.isNaN(year) ? undefined : year)

  return NextResponse.json(data)
}
