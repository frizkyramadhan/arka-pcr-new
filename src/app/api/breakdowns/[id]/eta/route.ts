/** PATCH /api/breakdowns/[id]/eta — save ETA RFU dates from the Summary Breakdown board. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { updateBreakdownEta } from '@/lib/dmbd/report-board'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

type RouteContext = { params: { id: string } }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  // Same audience as the board (reports) plus breakdown editors.
  const forbidden = requireAnyPermissionOrForbidden(session, ['breakdown.update', 'reports.access'])
  if (forbidden) return forbidden

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const etaInput: { etaRfuDate?: string | null; etaRfuIfPart?: string | number | null } = {}
  if ('etaRfuDate' in body) {
    etaInput.etaRfuDate = body.etaRfuDate == null ? null : String(body.etaRfuDate)
  }
  if ('etaRfuIfPart' in body) {
    const raw = body.etaRfuIfPart
    etaInput.etaRfuIfPart = raw == null || raw === '' ? null : typeof raw === 'number' ? raw : String(raw)
  }

  const result = await updateBreakdownEta(context.params.id, etaInput, projectCode =>
    canAccessProject(session, projectCode)
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ ok: true })
}
