/**
 * GET /api/breakdowns — grid. POST — save a breakdown.
 * Pass issueWorkOrder true to also create the SAP work order.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createBreakdown, type ActivityInput } from '@/lib/dmbd/breakdowns'
import { logBreakdownFromId } from '@/lib/dmbd/log'
import { preparedByLabel, woHeaderFrom } from '@/lib/dmbd/wo-header'
import { listBreakdowns } from '@/lib/dmbd/list'
import { requireAnyPermissionOrForbidden, requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { gridSortFromSearchParams, parseListPagination } from '@/lib/utils/list-pagination'
import { parseListSearch } from '@/lib/utils/list-search'
import { canAccessProject } from '@/lib/utils/project-scope'

function activityFrom(body: Record<string, unknown>): ActivityInput {
  const activity = (body.activity ?? {}) as Record<string, unknown>

  return {
    code: String(activity.code ?? ''),
    position: String(activity.position ?? 'BD'),
    startedDate: String(activity.startedDate ?? body.startedDate ?? ''),
    startedTime: String(activity.startedTime ?? body.startedTime ?? ''),
    endedDate: String(activity.endedDate ?? ''),
    endedTime: String(activity.endedTime ?? ''),
    details: String(activity.details ?? ''),
    technicianName: String(activity.technicianName ?? ''),
    technicianQty: String(activity.technicianQty ?? ''),
    handledBy: String(activity.handledBy ?? '')
  }
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, ['breakdown.read', 'reports.access'])
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const page = parseListPagination(searchParams)
  const sort = gridSortFromSearchParams(searchParams)

  const result = await listBreakdowns(session, {
    projectCode: searchParams.get('projectCode') || searchParams.get('projectId') || undefined,
    fleetUnitId: searchParams.get('fleetUnitId') || searchParams.get('unitId') || undefined,
    status: searchParams.get('status') || undefined,
    position: searchParams.get('position') || undefined,
    q: parseListSearch(searchParams) || undefined,
    bdFrom: searchParams.get('bdFrom') || undefined,
    bdTo: searchParams.get('bdTo') || undefined,
    finishFrom: searchParams.get('finishFrom') || undefined,
    finishTo: searchParams.get('finishTo') || undefined,
    description: searchParams.get('description') || undefined,
    page: page.page,
    pageSize: page.pageSize,
    sortField: sort.sortField,
    sortOrder: sort.sortOrder
  })

  return NextResponse.json({ ...result, rows: result.data })
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.create')
  if (forbidden) return forbidden

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const result = await createBreakdown(
    {
      fleetUnitId: Number(body.fleetUnitId),
      startedDate: String(body.startedDate ?? ''),
      startedTime: String(body.startedTime ?? ''),
      problem: String(body.problem ?? ''),
      hourMeter: String(body.hourMeter ?? ''),
      remark: String(body.remark ?? ''),
      issueWorkOrder: body.issueWorkOrder === true,
      workOrder: String(body.workOrder ?? ''),
      ...woHeaderFrom(body),
      preparedBy: preparedByLabel(session.user.name || ''),
      activity: activityFrom(body)
    },
    Number(session.user.id),
    projectCode => canAccessProject(session, projectCode)
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logBreakdownFromId(Number(session.user.id) || null, 'created', result.data.id, {
    properties: { issueWorkOrder: body.issueWorkOrder === true }
  })

  return NextResponse.json(result.data, { status: 201 })
}
