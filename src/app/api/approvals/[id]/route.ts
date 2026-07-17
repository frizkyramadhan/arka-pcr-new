import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getCannibalApprovalById } from '@/lib/cannibal/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idBaApproval = Number(params.id)
  if (!Number.isFinite(idBaApproval)) {
    return NextResponse.json({ error: 'Invalid approval id' }, { status: 400 })
  }

  const row = await getCannibalApprovalById(session, idBaApproval)
  if (!row) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })

  return NextResponse.json(row)
}
