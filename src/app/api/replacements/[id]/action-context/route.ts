import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  getReplacementCloseContext,
  getReplacementReopenContext
} from '@/lib/replacement/action-context'
import { requirePermissionOrForbidden, requireSession, requireAnyPermissionOrForbidden } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idRep = Number(params.id)
  const mode = request.nextUrl.searchParams.get('mode')

  if (mode === 'reopen') {
    const forbidden = requireAnyPermissionOrForbidden(session, ['system.admin', 'replacements.update'])
    if (forbidden) return forbidden

    const context = await getReplacementReopenContext(session, idRep)
    if (!context) {
      return NextResponse.json({ error: 'Closed replacement not found' }, { status: 404 })
    }

    return NextResponse.json(context)
  }

  const forbidden = requirePermissionOrForbidden(session, 'replacements.close')
  if (forbidden) return forbidden

  const context = await getReplacementCloseContext(session, idRep)
  if (!context) {
    return NextResponse.json({ error: 'Open replacement not found' }, { status: 404 })
  }

  return NextResponse.json(context)
}
