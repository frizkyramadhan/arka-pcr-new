/**
 * HTML + text templates untuk notifikasi email ARKA PCR (layout modern).
 */

import {
  EMAIL_THEMES,
  emailShell,
  escapeHtml,
  infoGrid,
  remarkBox,
  textFromRows
} from '@/lib/notifications/email-layout'
import { getAppBaseUrl } from '@/lib/notifications/mailer'
import type {
  ApprovalDecisionPayload,
  ApprovalPendingPayload,
  CannibalHandoffPayload,
  CannibalRequestorPayload,
  DocumentContext,
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

function requestorJabatanLabel(payload: {
  requestorRoleLabel?: string | null
  requestorRole?: string | null
}): string {
  return payload.requestorRoleLabel?.trim() || payload.requestorRole?.trim() || 'Request By'
}

function cannibalInfoItems(ctx: DocumentContext & { requestorRoleLabel?: string | null; requestorName?: string | null }) {
  const base = documentInfoItems(ctx)
  if (ctx.requestorRoleLabel || ctx.requestorName) {
    base.push({ label: 'Jabatan', value: ctx.requestorRoleLabel }, { label: 'Requestor', value: ctx.requestorName })
  }

  return base
}

function cannibalHandoffCopy(
  handoff: CannibalHandoffPayload['handoff'],
  requestorRoleLabel?: string | null
) {
  const jabatan = requestorRoleLabel?.trim() || 'Request By'

  if (handoff === 'TO_LOGISTICS') {
    return {
      theme: EMAIL_THEMES.handoff,
      headline: 'Cannibal BA siap untuk logistic statement',
      subject: (no: string) => `[ARKA PCR] ${no} menunggu logistics`,
      note: `${jabatan} telah confirm. Mohon lengkapi logistic statement.`
    }
  }

  return {
    theme: EMAIL_THEMES.handoff,
    headline: 'Logistic statement confirmed — siap dokumentasi / submit',
    subject: (no: string) => `[ARKA PCR] ${no} logistics confirmed`,
    note: 'Logistics telah confirm statement. Plant dapat melanjutkan dokumentasi dan submit approval.'
  }
}

function cannibalRequestorCopy(payload: CannibalRequestorPayload) {
  const jabatan = requestorJabatanLabel(payload)

  switch (payload.event) {
    case 'cannibal_requestor_pending':
      return {
        theme: EMAIL_THEMES.pending,
        headline: `Cannibal BA menunggu konfirmasi ${jabatan}`,
        subject: `[ARKA PCR] ${payload.documentNo} menunggu konfirmasi ${jabatan}`,
        note: `Plant telah mengajukan permintaan ${jabatan}. Mohon confirm atau reject (acuan naikkan order P1).`,
        ctaLabel: `Konfirmasi ${jabatan}`
      }
    case 'cannibal_requestor_confirmed':
      return {
        theme: EMAIL_THEMES.approved,
        headline: `${jabatan} mengonfirmasi Cannibal BA`,
        subject: `[ARKA PCR] ${payload.documentNo} dikonfirmasi ${jabatan}`,
        note: `${jabatan} telah confirm. BA lanjut ke tahap Logistics.`,
        ctaLabel: 'Buka Cannibal BA'
      }
    default:
      return {
        theme: EMAIL_THEMES.rejected,
        headline: `${jabatan} menolak Cannibal BA`,
        subject: `[ARKA PCR] ${payload.documentNo} ditolak ${jabatan} — revisi plant`,
        note: `${jabatan} menolak BA. Gunakan sebagai acuan naikkan order P1, lalu edit dan submit ulang.`,
        ctaLabel: 'Buka Cannibal BA'
      }
  }
}

export function renderCannibalRequestor(payload: CannibalRequestorPayload): RenderedEmail {
  const copy = cannibalRequestorCopy(payload)
  const rows = cannibalInfoItems(payload).map(item => [item.label, item.value] as [string, string | null | undefined])
  const bodyHtml = `${infoGrid(cannibalInfoItems(payload))}${remarkBox(payload.remark)}`

  return {
    subject: copy.subject,
    html: emailShell({
      theme: copy.theme,
      headline: copy.headline,
      subheadline: copy.note,
      bodyHtml,
      ctaUrl: payload.detailUrl,
      ctaLabel: copy.ctaLabel
    }),
    text: textFromRows(copy.headline, rows, payload.detailUrl)
  }
}

export function renderCannibalHandoff(payload: CannibalHandoffPayload): RenderedEmail {
  const copy = cannibalHandoffCopy(payload.handoff, payload.requestorRoleLabel)
  const headline = copy.headline
  const subject = copy.subject(payload.documentNo)
  const rows = documentTextRows(payload)

  return {
    subject,
    html: emailShell({
      theme: copy.theme,
      headline,
      subheadline: copy.note,
      bodyHtml: infoGrid(documentInfoItems(payload)),
      ctaUrl: payload.detailUrl,
      ctaLabel: 'Buka Cannibal BA'
    }),
    text: textFromRows(headline, rows, payload.detailUrl)
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
    case 'cannibal_requestor_pending':
    case 'cannibal_requestor_confirmed':
    case 'cannibal_requestor_rejected':
      return renderCannibalRequestor(payload)
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
        handoff: 'TO_LOGISTICS',
        requestorRoleLabel: 'PJO'
      }
    case 'cannibal_requestor_pending':
      return {
        event,
        kind: 'CANNIBAL',
        documentId: 0,
        documentNo,
        unitNo,
        projectCode,
        compDesc,
        actorName,
        remark: sample.remark ?? 'Mohon review dan confirm permintaan jabatan Anda di ARKA PCR.',
        detailUrl: `${baseUrl}/cannibals/0`,
        requestorRole: 'PJO',
        requestorRoleLabel: 'PJO',
        requestorName: 'Trial Requestor'
      }
    case 'cannibal_requestor_confirmed':
      return {
        event,
        kind: 'CANNIBAL',
        documentId: 0,
        documentNo,
        unitNo,
        projectCode,
        compDesc,
        actorName: actorName ?? 'Trial Requestor',
        detailUrl: `${baseUrl}/cannibals/0`,
        requestorRole: 'PJO',
        requestorRoleLabel: 'PJO',
        requestorName: actorName ?? 'Trial Requestor'
      }
    case 'cannibal_requestor_rejected':
      return {
        event,
        kind: 'CANNIBAL',
        documentId: 0,
        documentNo,
        unitNo,
        projectCode,
        compDesc,
        actorName: actorName ?? 'Trial Requestor',
        remark: sample.remark ?? 'Mohon naikkan order P1 terlebih dahulu sebelum submit ulang kanibal.',
        detailUrl: `${baseUrl}/cannibals/0`,
        requestorRole: 'PJO',
        requestorRoleLabel: 'PJO',
        requestorName: actorName ?? 'Trial Requestor'
      }
    case 'plain_ping':
      return { event, message: sample.message ?? 'Trial email dari halaman admin ARKA PCR.' }
    default: {
      const _exhaustive: never = event

      return _exhaustive
    }
  }
}
