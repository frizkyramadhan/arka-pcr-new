import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rejectCannibalRequestor } from '@/lib/cannibal/service'
import { cannibalRequestorRejectSchema } from '@/lib/validations/cannibal'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.access')
  if (forbidden) return forbidden

  const { id } = await context.params
  const idBa = Number(id)

  if (!Number.isFinite(idBa)) {
    return NextResponse.json({ error: 'Invalid BA id' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = cannibalRequestorRejectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Reject remark is required' }, { status: 400 })
  }

  try {
    const row = await rejectCannibalRequestor(session, idBa, parsed.data.remark)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reject requestor failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
