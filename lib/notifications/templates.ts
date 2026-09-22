/**
 * HTML + text templates untuk notifikasi email ARKA PCR (layout modern).
 */

import {
  EMAIL_THEMES,
  emailShell,
  escapeHtml,
  infoGrid,
  remarkBox,
  dataTable,
  textFromRows
} from '@/lib/notifications/email-layout'
import { getAppBaseUrl } from '@/lib/notifications/mailer'
import {
  MAINT_ACH_CRITICAL,
  MAINT_ACH_ON_TRACK,
  formatAch
} from '@/lib/fms/dashboard/achievement-digest'
import type {
  ApprovalDecisionPayload,
  ApprovalPendingPayload,
  CannibalExpiredPayload,
  CannibalHandoffPayload,
  CannibalRequestorPayload,
  DocumentContext,
  FullyApprovedPayload,
  MaintenanceAchievementPayload,
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

export function renderCannibalExpired(payload: CannibalExpiredPayload): RenderedEmail {
  const waitingOn = payload.waitingOn?.trim() || 'pihak yang sedang menunggu tindakan'
  const headline = `${payload.documentNo} expired`
  const subject = `[ARKA PCR] ${payload.documentNo} expired — ajukan BA baru`

  const items = [
    ...documentInfoItems(payload),
    { label: 'Menunggu', value: waitingOn }
  ]
  const rows = items.map(item => [item.label, item.value] as [string, string | null | undefined])
  const note = `Batas 5 hari (24 jam) sejak Plant Submit terlampaui. Cannibal BA ini tidak dapat dilanjutkan. Plant harus mengajukan BA baru. Saat expired, dokumen menunggu: ${waitingOn}.`

  return {
    subject,
    html: emailShell({
      theme: EMAIL_THEMES.rejected,
      headline,
      subheadline: note,
      bodyHtml: infoGrid(items),
      ctaUrl: payload.detailUrl,
      ctaLabel: 'Buka Cannibal BA'
    }),
    text: textFromRows(headline, rows, payload.detailUrl)
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

function achTheme(mtdAch: number | null) {
  if (mtdAch == null) return EMAIL_THEMES.ping
  if (mtdAch >= MAINT_ACH_ON_TRACK) return EMAIL_THEMES.ach_good
  if (mtdAch < MAINT_ACH_CRITICAL) return EMAIL_THEMES.ach_crit

  return EMAIL_THEMES.ach_warn
}

function achCellHtml(value: number | null): string {
  const label = formatAch(value)
  if (value == null) {
    return `<span style="color:#94a3b8;">${escapeHtml(label)}</span>`
  }

  const color =
    value >= MAINT_ACH_ON_TRACK ? '#059669' : value < MAINT_ACH_CRITICAL ? '#b91c1c' : '#d97706'

  return `<strong style="color:${color};">${escapeHtml(label)}</strong>`
}

export function renderMaintenanceAchievement(payload: MaintenanceAchievementPayload): RenderedEmail {
  const mtdLabel = formatAch(payload.mtd.ach)
  const ytdLabel = formatAch(payload.ytd.ach)
  const subject = `[ARKA PCR] Maintenance ACH — ${payload.siteId} — ${payload.periodLabel}: MTD ${mtdLabel} · YTD ${ytdLabel}`
  const headline = `Ketercapaian Maintenance — ${payload.siteName}`
  const theme = achTheme(payload.mtd.ach)

  const recipientNote =
    payload.recipientNote?.trim() ||
    'Pengiriman terjadwal: TO Plant site · CC Head Office (000H).'

  const kpiHtml = infoGrid([
    { label: 'Site', value: payload.siteId },
    { label: 'Periode MTD', value: payload.mtdPeriodLabel },
    { label: 'Plan MTD', value: String(payload.mtd.plan) },
    { label: 'Actual MTD', value: String(payload.mtd.actual) },
    { label: 'ACH MTD', value: mtdLabel },
    { label: 'Plan YTD', value: String(payload.ytd.plan) },
    { label: 'Actual YTD', value: String(payload.ytd.actual) },
    { label: 'ACH YTD', value: ytdLabel }
  ])

  const tableRows = payload.byType.map(row => [
    escapeHtml(row.typeName),
    `${row.mtd.actual}/${row.mtd.plan} · ${achCellHtml(row.mtd.ach)}`,
    `${row.ytd.actual}/${row.ytd.plan} · ${achCellHtml(row.ytd.ach)}`
  ])

  const tableHtml =
    tableRows.length > 0
      ? `<p style="margin:20px 0 0;font-family:Segoe UI,Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#0f172a;text-transform:uppercase;">Per program</p>${dataTable(
          ['Type', 'MTD (Act/Plan · ACH)', 'YTD (Act/Plan · ACH)'],
          tableRows
        )}`
      : ''

  const gapText =
    payload.belowCritical.length > 0
      ? `Program di bawah ${MAINT_ACH_CRITICAL}% MTD: ${payload.belowCritical
          .slice(0, 5)
          .map(g => `${g.typeName} (${g.ach.toFixed(1)}%)`)
          .join(', ')}.`
      : `Tidak ada program di bawah ${MAINT_ACH_CRITICAL}% MTD pada periode ini.`

  const bodyHtml = `${kpiHtml}${tableHtml}<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:16px;"><tr><td style="font-family:Segoe UI,Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#475569;mso-line-height-rule:exactly;">${escapeHtml(
    gapText
  )}</td></tr></table>${remarkBox(recipientNote)}`

  const textRows: Array<[string, string | null | undefined]> = [
    ['Site', payload.siteId],
    ['Periode MTD', payload.mtdPeriodLabel],
    ['ACH MTD', `${mtdLabel} (${payload.mtd.actual}/${payload.mtd.plan})`],
    ['ACH YTD', `${ytdLabel} (${payload.ytd.actual}/${payload.ytd.plan})`],
    ...payload.byType.map(
      row =>
        [
          row.typeName,
          `MTD ${formatAch(row.mtd.ach)} · YTD ${formatAch(row.ytd.ach)}`
        ] as [string, string]
    )
  ]

  return {
    subject,
    html: emailShell({
      theme,
      headline,
      subheadline: `Ringkasan MTD & YTD ${payload.periodLabel}. Data dari plan vs actual maintenance.`,
      bodyHtml,
      ctaUrl: payload.dashboardUrl,
      ctaLabel: 'Buka dashboard Maintenance',
      footerNote: 'Pesan otomatis dari ARKA PCR (digest Jumat). Mohon tidak membalas email ini.'
    }),
    text: textFromRows(headline, textRows, payload.dashboardUrl)
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
    case 'cannibal_expired':
      return renderCannibalExpired(payload)
    case 'maintenance_achievement':
      return renderMaintenanceAchievement(payload)
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
    case 'cannibal_expired':
      return {
        event,
        kind: 'CANNIBAL',
        documentId: 0,
        documentNo,
        unitNo,
        projectCode,
        compDesc,
        actorName,
        detailUrl: `${baseUrl}/cannibals/0`,
        waitingOn: sample.waitingOn ?? 'Request By (PJO)'
      }
    case 'maintenance_achievement': {
      const site = projectCode || 'BLT'
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      const monthLabels = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des'
      ]
      const periodLabel = `${monthLabels[month - 1]} ${year}`

      return {
        event,
        siteId: site,
        siteName: site,
        year,
        month,
        periodLabel,
        mtdPeriodLabel: `1–${now.getDate()} ${periodLabel}`,
        mtd: { plan: 40, actual: 29, ach: 72.5 },
        ytd: { plan: 320, actual: 218, ach: 68.0 },
        byType: [
          {
            typeName: 'Washing',
            mtd: { plan: 20, actual: 11, ach: 55 },
            ytd: { plan: 160, actual: 98, ach: 61.3 }
          },
          {
            typeName: 'Greasing',
            mtd: { plan: 10, actual: 6, ach: 60 },
            ytd: { plan: 80, actual: 56, ach: 70 }
          },
          {
            typeName: 'Service',
            mtd: { plan: 10, actual: 12, ach: 120 },
            ytd: { plan: 80, actual: 64, ach: 80 }
          }
        ],
        belowCritical: [
          { typeName: 'Washing', ach: 55 },
          { typeName: 'Greasing', ach: 60 }
        ],
        dashboardUrl: `${baseUrl}/dashboards/maintenance?year=${year}&projectId=${encodeURIComponent(site)}`,
        recipientNote: 'Pengiriman terjadwal Jumat: TO Plant site · CC Head Office (000H).'
      }
    }
    case 'plain_ping':
      return { event, message: sample.message ?? 'Trial email dari halaman admin ARKA PCR.' }
    default: {
      const _exhaustive: never = event

      return _exhaustive
    }
  }
}
