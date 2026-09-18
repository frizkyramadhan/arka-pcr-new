/**
 * GET /api/dashboard/stats — FMS maintenance KPI (Total Unit, Plan, Actual, Selisih).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getFmsDashboardStats } from '@/lib/fms/dashboard/stats'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  try {
    const stats = await getFmsDashboardStats()

    return NextResponse.json(stats)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load FMS stats'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
