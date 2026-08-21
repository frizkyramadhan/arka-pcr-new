/**
 * Admin trial email — kirim template notifikasi ke custom address (system.admin).
 * GET: status runtime mail (tanpa expose API key).
 * POST: { to, event, sample? }
 * PATCH: { mailEnabled: boolean } — toggle runtime MAIL_ENABLED.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { logActivity } from '@/lib/activity-log'
import { getMailRuntimeStatus, NOTIFICATION_EVENTS, sendTrialEmail, setMailEnabled, verifySmtpConnection } from '@/lib/notifications'
import { listPreviewSamples } from '@/lib/notifications/sample-data'
import type { NotificationEvent, TrialSample } from '@/lib/notifications'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  const smtpCheck = await verifySmtpConnection()
  const previewSamples = await listPreviewSamples()

  return NextResponse.json({
    data: {
      ...getMailRuntimeStatus(),
      smtpReachable: smtpCheck.ok,
      smtpError: smtpCheck.error ?? null,
      events: NOTIFICATION_EVENTS,
      previewSamples
    }
  })
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  let body: { to?: string; event?: string; sample?: TrialSample }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const to = typeof body.to === 'string' ? body.to.trim() : ''
  const event = body.event as NotificationEvent
  if (!to) {
    return NextResponse.json({ error: 'Field "to" is required' }, { status: 400 })
  }
  if (!NOTIFICATION_EVENTS.includes(event)) {
    return NextResponse.json(
      { error: `Invalid event. Allowed: ${NOTIFICATION_EVENTS.join(', ')}` },
      { status: 400 }
    )
  }

  const adminUserId = Number(session.user.id)

  const result = await sendTrialEmail({
    to,
    event,
    sample: body.sample,
    adminUserId: Number.isFinite(adminUserId) ? adminUserId : undefined
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, subject: result.subject },
      { status: 502 }
    )
  }

  return NextResponse.json({
    data: {
      id: result.id,
      skipped: result.skipped ?? false,
      reason: result.reason ?? null,
      subject: result.subject,
      to,
      event
    }
  })
}

/** Toggle runtime MAIL_ENABLED (persist, override env until next toggle). */
export async function PATCH(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  let body: { mailEnabled?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.mailEnabled !== 'boolean') {
    return NextResponse.json({ error: 'Field "mailEnabled" (boolean) is required' }, { status: 400 })
  }

  const toggle = setMailEnabled(body.mailEnabled)

  logActivity({
    session,
    logName: 'system',
    event: 'updated',
    description: `MAIL_ENABLED ${toggle.mailEnabled ? 'on' : 'off'}`,
    subjectType: 'MailSetting',
    properties: {
      mailEnabled: toggle.mailEnabled,
      previous: toggle.previousMailEnabled,
      source: toggle.mailEnabledSource
    }
  })

  return NextResponse.json({
    data: {
      ...getMailRuntimeStatus(),
      ...toggle
    }
  })
}
