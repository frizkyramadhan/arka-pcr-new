import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { closeReplacement } from '@/lib/replacement/service'
import { replacementCloseSchema } from '@/lib/validations/replacement'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'replacements.close')
  if (forbidden) return forbidden

  const idRep = Number(params.id)
  const body = await request.json()
  const parsed = replacementCloseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await closeReplacement(session, idRep, parsed.data)
    if (!row) return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Close failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
