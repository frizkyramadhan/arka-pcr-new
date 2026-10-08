/**
 * GET /api/maintenance-actuals/pic-options?projectCode= — active users on this site (or head office)
 * that the actual form can pick as PIC.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listPicCandidates } from '@/lib/fms/maintenance-actuals'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'maintenance-actual.create',
    'maintenance-actual.update'
  ])
  if (forbidden) return forbidden

  const projectCode = request.nextUrl.searchParams.get('projectCode')?.trim() ?? ''
  if (!projectCode) {
    return NextResponse.json({ error: 'projectCode is required' }, { status: 400 })
  }

  if (!canAccessProject(session, projectCode)) {
    return NextResponse.json({ error: 'Project code is outside your scope' }, { status: 403 })
  }

  const rows = await listPicCandidates(projectCode)

  return NextResponse.json({ rows })
}
