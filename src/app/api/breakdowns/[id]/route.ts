/** GET / PATCH / DELETE /api/breakdowns/[id] — detail, update header, hard-delete. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteBreakdown, updateBreakdown } from '@/lib/dmbd/breakdowns'
import { logBreakdownEvent, logBreakdownFromId } from '@/lib/dmbd/log'
import { getBreakdownDetail } from '@/lib/dmbd/list'
import { preparedByLabel, woHeaderFrom } from '@/lib/dmbd/wo-header'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

type RouteContext = { params: { id: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const { id } = context.params
  const row = await getBreakdownDetail(id)
  if (!row) return NextResponse.json({ error: 'Breakdown was not found' }, { status: 404 })
  if (!canAccessProject(session, row.projectCode)) {
    return NextResponse.json({ error: 'You cannot view this breakdown' }, { status: 403 })
  }

  return NextResponse.json(row)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.update')
  if (forbidden) return forbidden

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { id } = context.params

  const result = await updateBreakdown(
    id,
    {
      problem: String(body.problem ?? ''),
      hourMeter: String(body.hourMeter ?? ''),
      remark: String(body.remark ?? ''),
      startedDate: body.startedDate != null ? String(body.startedDate) : undefined,
      startedTime: body.startedTime != null ? String(body.startedTime) : undefined,
      issueWorkOrder: body.issueWorkOrder === true,
      workOrder: String(body.workOrder ?? ''),
      ...woHeaderFrom(body),
      preparedBy: preparedByLabel(session.user.name || '')
    },
    projectCode => canAccessProject(session, projectCode)
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logBreakdownFromId(Number(session.user.id) || null, 'updated', id)

  return NextResponse.json(result.data)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.delete')
  if (forbidden) return forbidden

  const { id } = context.params
  const before = await getBreakdownDetail(id)

  const result = await deleteBreakdown(id, projectCode => canAccessProject(session, projectCode))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  logBreakdownEvent({
    causerId: Number(session.user.id) || null,
    event: 'deleted',
    entityId: id,
    registerNo: before?.registerNo,
    unitNo: before?.unitNo,
    projectCode: before?.projectCode,
    workOrder: before?.workOrder,
    problem: before?.problem,
    properties: { cancelledSap: result.data.cancelledSap }
  })

  return NextResponse.json(result.data)
}
