/** PATCH and DELETE one activity on an open breakdown. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteBreakdownActivity, updateBreakdownActivity } from '@/lib/dmbd/breakdowns'
import { logBreakdownFromId } from '@/lib/dmbd/log'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

type RouteContext = { params: { id: string; activityId: string } }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.update')
  if (forbidden) return forbidden

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { id, activityId } = context.params

  const result = await updateBreakdownActivity(
    id,
    activityId,
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
    projectCode => canAccessProject(session, projectCode)
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logBreakdownFromId(Number(session.user.id) || null, 'activity-updated', id, {
    activityCode: String(body.code ?? ''),
    position: String(body.position ?? ''),
    properties: { activityId }
  })

  return NextResponse.json(result.data)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.update')
  if (forbidden) return forbidden

  const { id, activityId } = context.params
  const result = await deleteBreakdownActivity(id, activityId, projectCode => canAccessProject(session, projectCode))

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logBreakdownFromId(Number(session.user.id) || null, 'activity-deleted', id, {
    properties: { activityId }
  })

  return NextResponse.json(result.data)
}
