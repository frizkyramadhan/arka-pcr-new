/** POST /api/breakdowns/[id]/activities — another activity on the same work order. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { addBreakdownActivity } from '@/lib/dmbd/breakdowns'
import { logBreakdownFromId } from '@/lib/dmbd/log'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.update')
  if (forbidden) return forbidden

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { id } = context.params

  const result = await addBreakdownActivity(
    id,
    {
      code: String(body.code ?? ''),
      position: String(body.position ?? ''),
      startedDate: String(body.startedDate ?? ''),
      startedTime: String(body.startedTime ?? ''),
      endedDate: String(body.endedDate ?? ''),
      endedTime: String(body.endedTime ?? ''),
      details: String(body.details ?? ''),
      technicianName: String(body.technicianName ?? ''),
      technicianQty: String(body.technicianQty ?? ''),
      handledBy: String(body.handledBy ?? '')
    },
    Number(session.user.id),
    projectCode => canAccessProject(session, projectCode)
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logBreakdownFromId(Number(session.user.id) || null, 'activity-added', id, {
    activityCode: String(body.code ?? ''),
    position: String(body.position ?? '')
  })

  return NextResponse.json(result.data, { status: 201 })
}
