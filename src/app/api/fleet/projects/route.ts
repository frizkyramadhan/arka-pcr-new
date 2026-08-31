import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listAllProjectsUnscoped, listProjectsForSession } from '@/lib/fleet-api/equipment-service'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const unscoped = request.nextUrl.searchParams.get('unscoped') === '1'
  if (unscoped) {
    const forbidden = requireAnyPermissionOrForbidden(session, ['cannibals.create', 'cannibals.update'])
    if (forbidden) return forbidden

    return NextResponse.json(await listAllProjectsUnscoped())
  }

  const projects = await listProjectsForSession(session)

  return NextResponse.json(projects)
}
