import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { seedLegacyCannibalApprovalChain } from '@/lib/cannibal/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idBa = Number(params.id)

  try {
    const row = await seedLegacyCannibalApprovalChain(session, idBa)
    if (!row) return NextResponse.json({ error: 'BA not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Seed approval failed'
    const status = message === 'Forbidden' ? 403 : 400

    return NextResponse.json({ error: message }, { status })
  }
}
