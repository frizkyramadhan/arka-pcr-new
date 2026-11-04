/** POST /api/breakdowns/[id]/close — write resolution and close the SAP work order. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { closeBreakdown } from '@/lib/dmbd/breakdowns'
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

  const result = await closeBreakdown(
    id,
    String(body.resolution ?? ''),
    String(body.finishedDate ?? ''),
    String(body.finishedTime ?? ''),
    projectCode => canAccessProject(session, projectCode)
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logBreakdownFromId(Number(session.user.id) || null, 'closed', id)

  return NextResponse.json(result.data)
}
