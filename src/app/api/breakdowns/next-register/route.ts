/**
 * GET /api/breakdowns/next-register?projectCode=&startedDate=
 * Pratinjau nomor register BD (yang tersimpan saat create yang berlaku).
 */
import { NextRequest, NextResponse } from 'next/server'

import { previewBreakdownRegisterNo } from '@/lib/dmbd/register-no'
import { sapClock, clockToDate } from '@/lib/dmbd/payload'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const projectCode = String(request.nextUrl.searchParams.get('projectCode') ?? '').trim()
  const startedDate = String(request.nextUrl.searchParams.get('startedDate') ?? '').trim()
  if (!projectCode || !startedDate) {
    return NextResponse.json({ error: 'projectCode and startedDate are required' }, { status: 400 })
  }
  if (!canAccessProject(session, projectCode)) {
    return NextResponse.json({ error: 'You cannot view this project' }, { status: 403 })
  }

  const clock = sapClock(startedDate, '00:00')
  const startedAt = clock ? clockToDate(clock) : null
  if (!startedAt) {
    return NextResponse.json({ error: 'startedDate is invalid' }, { status: 400 })
  }

  const registerNo = await previewBreakdownRegisterNo(projectCode, startedAt)
  if (!registerNo) {
    return NextResponse.json({ error: 'Could not preview register number' }, { status: 400 })
  }

  return NextResponse.json({ registerNo })
}
