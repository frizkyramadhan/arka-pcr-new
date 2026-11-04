/** GET /api/dashboard/dmbd — dashboard Daily Monitoring Unit Breakdown untuk site user. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { loadDmbdDashboard } from '@/lib/dmbd/dashboard-db'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl

  const data = await loadDmbdDashboard(session, {
    projectCode: searchParams.get('projectCode') || searchParams.get('projectId') || undefined,
    plant: searchParams.get('plant') || undefined,
    category: searchParams.get('category') || undefined,
    status: searchParams.get('status') || undefined,
    date: searchParams.get('date') || undefined,
    period: searchParams.get('period') || undefined,
    mode: searchParams.get('mode') || searchParams.get('view') || undefined
  })

  return NextResponse.json(data)
}
