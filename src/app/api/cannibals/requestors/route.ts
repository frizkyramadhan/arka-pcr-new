import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isCannibalRequestRole, listRequestorCandidates } from '@/lib/cannibal/requestor'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.access')
  if (forbidden) return forbidden

  const role = request.nextUrl.searchParams.get('role')
  const projectCode = request.nextUrl.searchParams.get('projectCode')?.trim() ?? ''

  if (!isCannibalRequestRole(role)) {
    return NextResponse.json({ error: 'Invalid requestor role' }, { status: 400 })
  }

  if (!projectCode) {
    return NextResponse.json({ error: 'projectCode is required' }, { status: 400 })
  }

  if (!canAccessProject(session, projectCode)) {
    return NextResponse.json({ error: 'Project code is outside your scope' }, { status: 403 })
  }

  const rows = await listRequestorCandidates(role, projectCode)

  return NextResponse.json({ rows })
}
