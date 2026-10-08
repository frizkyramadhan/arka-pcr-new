import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listProjectsForUserAdmin } from '@/lib/fleet-api/projects-service'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

/** GET /api/projects — proxy PROJECTS_API_URL for the user project dropdown (System → Users). */
export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'users.read')
  if (forbidden) return forbidden

  const { items, source } = await listProjectsForUserAdmin()

  return NextResponse.json(items, {
    headers: { 'X-Projects-Source': source }
  })
}
