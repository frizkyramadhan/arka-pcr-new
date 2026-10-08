/**
 * GET /api/admin/activity-logs — list Spatie-style activity log (system.access + activity-logs.read).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getActivityLogFilterOptions, listActivityLogs, parseActivityLogListQuery } from '@/lib/activity-log'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'activity-logs.read')
  if (forbidden) return forbidden

  const { searchParams } = new URL(request.url)
  if (searchParams.get('meta') === '1') {
    const options = await getActivityLogFilterOptions()

    return NextResponse.json({ data: options })
  }

  const query = parseActivityLogListQuery(searchParams)
  const result = await listActivityLogs(query)

  return NextResponse.json(result)
}
