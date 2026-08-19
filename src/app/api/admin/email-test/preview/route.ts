/**
 * Admin email template preview — render HTML in browser without sending (system.admin).
 * GET ?event=approval_pending&documentNo=...&level=...&unitNo=...&projectCode=...&message=...
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { NOTIFICATION_EVENTS } from '@/lib/notifications'
import type { NotificationEvent } from '@/lib/notifications'
import { parseTrialSampleFromSearchParams, renderTrialEmailPreview } from '@/lib/notifications/preview'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  const { searchParams } = new URL(request.url)
  const event = (searchParams.get('event') ?? '').trim() as NotificationEvent

  if (!event || !NOTIFICATION_EVENTS.includes(event)) {
    return NextResponse.json(
      { error: `Invalid or missing event. Allowed: ${NOTIFICATION_EVENTS.join(', ')}` },
      { status: 400 }
    )
  }

  const sample = parseTrialSampleFromSearchParams(searchParams)
  const preview = await renderTrialEmailPreview(event, sample)

  return new NextResponse(preview.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}
