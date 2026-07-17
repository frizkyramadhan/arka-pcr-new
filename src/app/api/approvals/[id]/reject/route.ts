import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rejectBaLevel } from '@/lib/cannibal/service'
import { baApprovalActionSchema } from '@/lib/validations/cannibal'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idBaApproval = Number(params.id)
  const body = await request.json().catch(() => ({}))
  const parsed = baApprovalActionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await rejectBaLevel(session, idBaApproval, parsed.data.remark)
    if (!row) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reject failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
