/**
 * HTML + text templates untuk notifikasi email ARKA PCR (layout modern).
 */

import {
  dataTable,
  EMAIL_THEMES,
  emailShell,
  escapeHtml,
  infoGrid,
  lifeBar,
  remarkBox,
  statusBadge,
  textFromRows
} from '@/lib/notifications/email-layout'
import { getAppBaseUrl } from '@/lib/notifications/mailer'
import type {
  ApprovalDecisionPayload,
  ApprovalPendingPayload,
  CannibalHandoffPayload,
  DocumentContext,
  DueOverduePayload,
  FullyApprovedPayload,
  NotificationEvent,
  NotificationPayload,
  PlainPingPayload,
  TrialSample
} from '@/lib/notifications/types'

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

function kindLabel(kind: DocumentContext['kind']): string {
  return kind === 'PCR_FORECAST' ? 'BA PCR' : 'Cannibal BA'
}

function documentInfoItems(ctx: DocumentContext): Array<{ label: string; value: string | null | undefined }> {
  const levelDisplay = ctx.levelLabel
    ? `${ctx.level ?? ''} — ${ctx.levelLabel}`.trim()
    : ctx.level

  return [
    { label: 'Dokumen', value: ctx.documentNo },
    { label: 'Jenis', value: kindLabel(ctx.kind) },
    { label: 'Unit', value: ctx.unitNo },
    { label: 'Project', value: ctx.projectCode },
    { label: 'Komponen', value: ctx.compDesc },
    { label: 'Level', value: levelDisplay },
    { label: 'Oleh', value: ctx.actorName }
  ]
}

function documentTextRows(ctx: DocumentContext): Array<[string, string | null | undefined]> {
  return documentInfoItems(ctx).map(item => [item.label, item.value])
}

export function renderApprovalPending(payload: ApprovalPendingPayload): RenderedEmail {
  const docKind = kindLabel(payload.kind)
  const level = payload.level ?? 'approval'
  const headline = `${docKind} menunggu approval ${level}`
  const subject = `[ARKA PCR] ${payload.documentNo} menunggu approval ${level}`.trim()
  const rows = documentTextRows(payload)
  const bodyHtml = `${infoGrid(documentInfoItems(payload))}${remarkBox(payload.remark)}`

  return {
    subject,
    html: emailShell({
      theme: EMAIL_THEMES.pending,
      headline,
      subheadline: `Dokumen memerlukan tindakan Anda di level ${level}.`,
      bodyHtml,
      ctaUrl: payload.detailUrl,
      ctaLabel: 'Review approval'
    }),
    text: textFromRows(headline, rows, payload.detailUrl)
  }
}

export function renderApprovalDecision(payload: ApprovalDecisionPayload): RenderedEmail {
  const theme =
    payload.decision === 'APPROVED'
      ? EMAIL_THEMES.approved
      : payload.decision === 'REJECTED'
        ? EMAIL_THEMES.rejected
        : EMAIL_THEMES.revoked

  const decisionLabel =
    payload.decision === 'APPROVED' ? 'disetujui' : payload.decision === 'REJECTED' ? 'ditolak' : 'dicabut'
  const headline = `${payload.documentNo} ${decisionLabel}`
  const subject = `[ARKA PCR] ${payload.documentNo} ${decisionLabel}${payload.level ? ` — level ${payload.level}` : ''}`
  const rows = documentTextRows(payload)
  const bodyHtml = `${infoGrid(documentInfoItems(payload))}${remarkBox(payload.remark)}`

  return {
    subject,
    html: emailShell({
      theme,
      headline,
      subheadline: `${kindLabel(payload.kind)} — keputusan approval terbaru.`,
      bodyHtml,
      ctaUrl: payload.detailUrl,
      ctaLabel: 'Lihat dokumen'
    }),
    text: textFromRows(headline, rows, payload.detailUrl)
  }
}

export function renderFullyApproved(payload: FullyApprovedPayload): RenderedEmail {
  const headline = `${payload.documentNo} fully approved`
  const subject = `[ARKA PCR] ${payload.documentNo} fully approved`
  const rows = documentTextRows(payload)
  const bodyHtml = `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="padding:0 0 16px;font-family:Segoe UI,Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#475569;mso-line-height-rule:exactly;">Semua level approval telah selesai. Dokumen siap dilanjutkan ke tahap berikutnya.</td></tr></table>${infoGrid(documentInfoItems(payload))}${remarkBox(payload.remark)}`

  return {
    subject,
    html: emailShell({
      theme: EMAIL_THEMES.complete,
      headline,
      subheadline: `${kindLabel(payload.kind)} — seluruh rantai approval complete.`,
      bodyHtml,
      ctaUrl: payload.detailUrl,
      ctaLabel: 'Buka dokumen'
    }),
    text: textFromRows(headline, rows, payload.detailUrl)
  }
}

export function renderCannibalHandoff(payload: CannibalHandoffPayload): RenderedEmail {
  const isToLogistics = payload.handoff === 'TO_LOGISTICS'
  const headline = isToLogistics
    ? 'Cannibal BA siap untuk logistic statement'
    : 'Logistic statement confirmed — siap dokumentasi / submit'
  const subject = isToLogistics
    ? `[ARKA PCR] ${payload.documentNo} menunggu logistics`
    : `[ARKA PCR] ${payload.documentNo} logistics confirmed`
  const rows = documentTextRows(payload)
  const handoffNote = isToLogistics
    ? 'Plant telah submit handoff ke Logistics. Mohon lengkapi logistic statement.'
    : 'Logistics telah confirm statement. Plant dapat melanjutkan dokumentasi dan submit approval.'

  return {
    subject,
    html: emailShell({
      theme: EMAIL_THEMES.handoff,
      headline,
      subheadline: handoffNote,
      bodyHtml: infoGrid(documentInfoItems(payload)),
      ctaUrl: payload.detailUrl,
      ctaLabel: 'Buka Cannibal BA'
    }),
    text: textFromRows(headline, rows, payload.detailUrl)
  }
}

export function renderDueOverdue(payload: DueOverduePayload): RenderedEmail {
  const isOverdue = payload.bucket === 'OVERDUE'
  const theme = isOverdue ? EMAIL_THEMES.overdue : EMAIL_THEMES.due
  const label = isOverdue ? 'Overdue' : 'Due / critical'
  const headline = `${payload.items.length} rencana PCR ${label.toLowerCase()}`
  const subject = `[ARKA PCR] ${label} PCR plans (${payload.items.length})`

  const tableRows = payload.items.slice(0, 40).map(item => {
    const unitLink = `<a href="${escapeHtml(item.detailUrl)}" style="color:#0284c7;font-weight:bold;text-decoration:underline;">${escapeHtml(item.unitNo)}</a>`
    const bucketChip =
      item.bucket === 'OVERDUE'
        ? statusBadge('OVERDUE', '#fecaca', '#7f1d1d')
        : statusBadge('DUE', '#ffedd5', '#9a3412')

    return [
      unitLink,
      escapeHtml(item.compDesc ?? '—'),
      escapeHtml(item.projectCode),
      `${bucketChip}<br style="line-height:8px;">${lifeBar(item.lifePercent)}`
    ]
  })

  const more =
    payload.items.length > 40
      ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="padding-top:12px;font-family:Segoe UI,Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#64748b;mso-line-height-rule:exactly;">…dan ${payload.items.length - 40} forecast lainnya.</td></tr></table>`
      : ''

  const textLines = payload.items.slice(0, 40).map(
    item => `- ${item.unitNo} | ${item.compDesc ?? '-'} | ${item.lifePercent.toFixed(1)}% | ${item.projectCode} [${item.bucket}]`
  )

  return {
    subject,
    html: emailShell({
      theme,
      headline,
      subheadline: `Forecast OPEN dengan life ≥85% — mohon review rencana PCR.`,
      bodyHtml: `${dataTable(['Unit', 'Komponen', 'Project', 'Life %'], tableRows)}${more}`,
      ctaUrl: `${getAppBaseUrl()}/forecasts`,
      ctaLabel: 'Buka daftar forecast'
    }),
    text: [`ARKA PCR — ${label} PCR plans`, '', ...textLines, '', `Buka: ${getAppBaseUrl()}/forecasts`].join('\n')
  }
}

export function renderPlainPing(payload: PlainPingPayload): RenderedEmail {
  const message = payload.message?.trim() || 'Notifikasi email ARKA PCR berfungsi dengan baik.'
  const subject = '[ARKA PCR] Trial ping'

  return {
    subject,
    html: emailShell({
      theme: EMAIL_THEMES.ping,
      headline: 'Uji koneksi email',
      subheadline: 'Pesan trial dari halaman admin ARKA PCR.',
      bodyHtml: `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="font-family:Segoe UI,Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#334155;mso-line-height-rule:exactly;">${escapeHtml(message)}</td></tr></table>`
    }),
    text: `ARKA PCR — Uji koneksi email\n\n${message}`
  }
}

export function renderNotificationEmail(payload: NotificationPayload): RenderedEmail {
  switch (payload.event) {
    case 'approval_pending':
      return renderApprovalPending(payload)
    case 'approval_decision':
      return renderApprovalDecision(payload)
    case 'fully_approved':
      return renderFullyApproved(payload)
    case 'cannibal_handoff':
      return renderCannibalHandoff(payload)
    case 'due_overdue':
      return renderDueOverdue(payload)
    case 'plain_ping':
      return renderPlainPing(payload)
    default: {
      const _exhaustive: never = payload

      return _exhaustive
    }
  }
}

/** Fallback statis jika DB tidak tersedia (unit test / offline). */
export function buildTrialPayload(event: NotificationEvent, sample: TrialSample = {}): NotificationPayload {
  const baseUrl = getAppBaseUrl()
  const documentNo = sample.documentNo ?? 'BA-TRIAL-001'
  const level = sample.level ?? 'PS'
  const unitNo = sample.unitNo ?? 'EX-001'
  const projectCode = sample.projectCode ?? 'DEMO'
  const compDesc = sample.compDesc ?? 'ENGINE'
  const actorName = sample.actorName ?? 'Trial Admin'
  const detailUrl = `${baseUrl}/approvals/0`

  const remarkFor = (target: NotificationEvent): string | undefined => {
    if (sample.remark?.trim()) return sample.remark.trim()

    switch (target) {
      case 'approval_pending':
        return 'Mohon review dan approve sesuai kebijakan PCR site.'
      case 'approval_decision':
        return `Level ${level} telah disetujui. Mohon pantau kelanjutan approval berikutnya.`
      case 'fully_approved':
        return 'Seluruh level approval telah disetujui. Forecast siap dikonversi ke PCR actual sesuai rencana site.'
      default:
        return undefined
    }
  }

  const docBase = {
    kind: 'PCR_FORECAST' as const,
    documentId: 0,
    documentNo,
    unitNo,
    projectCode,
    compDesc,
    level,
    levelLabel: level,
    actorName,
    detailUrl
  }

  switch (event) {
    case 'approval_pending':
      return { event, ...docBase, remark: remarkFor(event), permissionCode: 'forecasts.approve.PS' }
    case 'approval_decision':
      return { event, ...docBase, remark: remarkFor(event), decision: 'APPROVED' }
    case 'fully_approved':
      return { event, ...docBase, remark: remarkFor(event) }
    case 'cannibal_handoff':
      return {
        event,
        ...docBase,
        kind: 'CANNIBAL',
        detailUrl: `${baseUrl}/cannibals/0`,
        handoff: 'TO_LOGISTICS'
      }
    case 'due_overdue':
      return {
        event,
        bucket: 'DUE',
        permissionCodes: ['forecasts.access'],
        projectCode,
        items: [
          {
            idForecast: 0,
            unitNo,
            projectCode,
            compDesc,
            lifePercent: 92.5,
            bucket: 'DUE',
            detailUrl: `${baseUrl}/forecasts`
          }
        ]
      }
    case 'plain_ping':
      return { event, message: sample.message ?? 'Trial email dari halaman admin ARKA PCR.' }
    default: {
      const _exhaustive: never = event

      return _exhaustive
    }
  }
}
