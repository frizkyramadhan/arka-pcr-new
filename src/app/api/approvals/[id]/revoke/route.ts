import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { revokeBaLevel } from '@/lib/cannibal/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(_request)
  if (session instanceof NextResponse) return session

  const idBaApproval = Number(params.id)

  try {
    const row = await revokeBaLevel(session, idBaApproval)
    if (!row) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Revoke failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
