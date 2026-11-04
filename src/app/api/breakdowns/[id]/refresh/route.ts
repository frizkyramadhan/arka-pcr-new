/** POST /api/breakdowns/[id]/refresh — copy the linked SAP work order onto this breakdown. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getBreakdownDetail } from '@/lib/dmbd/list'
import { syncBreakdownFromSap } from '@/lib/dmbd/sap-sync'
import { prisma } from '@/lib/prisma'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.update')
  if (forbidden) return forbidden

  const { id } = context.params

  const gate = await prisma.breakdown.findUnique({
    where: { id },
    select: { projectCode: true, sapServiceCallId: true }
  })
  if (!gate) return NextResponse.json({ error: 'Breakdown was not found' }, { status: 404 })
  if (!canAccessProject(session, gate.projectCode)) {
    return NextResponse.json({ error: 'You cannot change this breakdown' }, { status: 403 })
  }
  if (gate.sapServiceCallId == null) {
    return NextResponse.json({ error: 'This breakdown has no SAP work order' }, { status: 400 })
  }

  try {
    await syncBreakdownFromSap(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read the SAP work order'

    return NextResponse.json({ error: message }, { status: 502 })
  }

  const row = await getBreakdownDetail(id)
  if (!row) return NextResponse.json({ error: 'Breakdown was not found' }, { status: 404 })

  return NextResponse.json(row)
}
