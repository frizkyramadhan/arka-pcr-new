/**
 * GET /api/dashboard/achievement?year=&projectId= — FMS maintenance achievement grid.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getFmsAchievement } from '@/lib/fms/dashboard/achievement'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  try {
    const yearParam = request.nextUrl.searchParams.get('year')
    const year = yearParam ? Number(yearParam) : new Date().getFullYear()
    const projectIdRaw = request.nextUrl.searchParams.get('projectId')
    const projectId = projectIdRaw?.trim() ? projectIdRaw.trim() : null

    const data = await getFmsAchievement(Number.isNaN(year) ? new Date().getFullYear() : year, projectId)

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load FMS achievement'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
