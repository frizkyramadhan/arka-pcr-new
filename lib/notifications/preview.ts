/**
 * Render trial email preview (no SMTP send) — admin debug dengan data real DB.
 */

import { buildRealisticPreviewPayload, type PreviewDataSource } from '@/lib/notifications/sample-data'
import { buildTrialPayload, renderNotificationEmail } from '@/lib/notifications/templates'
import type { NotificationEvent, TrialSample } from '@/lib/notifications/types'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Banner di atas body email — preview browser, bukan kiriman nyata. */
export function wrapEmailPreviewHtml(
  subject: string,
  html: string,
  event: string,
  source?: PreviewDataSource
): string {
  const sourceLine = source
    ? ` · Sumber: <strong>${escapeHtml(source.label)}</strong>${source.documentNo ? ` (${escapeHtml(source.documentNo)})` : ''}`
    : ''

  const banner = `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td bgcolor="#fef3c7" style="background-color:#fef3c7;padding:10px 16px;font-family:Segoe UI,Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;border-bottom:1px solid #fcd34d;color:#92400e;mso-line-height-rule:exactly;">
        <strong>Preview only</strong> — tidak dikirim · Event: ${escapeHtml(event)} · Subject: ${escapeHtml(subject)}${sourceLine}
      </td>
    </tr>
  </table>`

  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${banner}`)
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body>${banner}${html}</body></html>`
}

export async function renderTrialEmailPreview(event: NotificationEvent, sample: TrialSample = {}) {
  let payload
  let source: PreviewDataSource | undefined

  try {
    const result = await buildRealisticPreviewPayload(event, sample)
    payload = result.payload
    source = result.source
  } catch {
    payload = buildTrialPayload(event, sample)
    source = { label: 'Fallback statis', fetchedAt: new Date().toISOString() }
  }

  const rendered = renderNotificationEmail(payload)

  return {
    event,
    subject: rendered.subject,
    html: wrapEmailPreviewHtml(rendered.subject, rendered.html, event, source),
    text: rendered.text,
    source
  }
}

export function parseTrialSampleFromSearchParams(searchParams: URLSearchParams): TrialSample {
  const pick = (key: keyof TrialSample) => {
    const value = searchParams.get(key)?.trim()

    return value || undefined
  }

  return {
    documentNo: pick('documentNo'),
    level: pick('level'),
    unitNo: pick('unitNo'),
    projectCode: pick('projectCode'),
    compDesc: pick('compDesc'),
    actorName: pick('actorName'),
    remark: pick('remark'),
    message: pick('message')
  }
}
