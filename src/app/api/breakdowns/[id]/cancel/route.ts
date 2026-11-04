/**
 * POST /api/breakdowns/[id]/cancel — soft-cancel open BD (status CANCEL, keep row).
 * Permission: breakdown.cancel
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { cancelBreakdown } from '@/lib/dmbd/breakdowns'
import { logBreakdownFromId } from '@/lib/dmbd/log'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.cancel')
  if (forbidden) return forbidden

  const { id } = context.params
  const result = await cancelBreakdown(id, projectCode => canAccessProject(session, projectCode))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  await logBreakdownFromId(Number(session.user.id) || null, 'cancelled', id, {
    properties: { cancelledSap: result.data.cancelledSap }
  })

  return NextResponse.json(result.data)
}
