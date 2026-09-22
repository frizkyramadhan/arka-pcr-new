/**
 * Dispatcher notifikasi email — resolve recipients, render template, kirim via SMTP (Nodemailer).
 * Fail-soft: error di-log, tidak throw ke caller bisnis.
 */

import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  getForecastApprovalChain,
  permissionCodeForLevel,
  type ApprovalChainId
} from '@/lib/approval/registry'
import { writeNotificationLog } from '@/lib/notifications/log'
import { fireAndForget, getAppBaseUrl, sendMail } from '@/lib/notifications/mailer'
import { findUserRecipientById, findUsersByPermission, findPlantToAndHoCcRecipients } from '@/lib/notifications/recipients'
import { buildRealisticPreviewPayload } from '@/lib/notifications/sample-data'
import { buildTrialPayload, renderNotificationEmail } from '@/lib/notifications/templates'
import { buildMaintenanceAchievementDigest } from '@/lib/fms/dashboard/achievement-digest'
import { getFmsAchievement } from '@/lib/fms/dashboard/achievement'
import { prisma } from '@/lib/prisma'
import type {
  ApprovalDecision,
  CannibalExpiredPayload,
  CannibalHandoffPayload,
  CannibalRequestorEvent,
  DocumentKind,
  HandoffKind,
  MailRecipient,
  MaintenanceAchievementPayload,
  NotificationEvent,
  NotificationPayload,
  SendMailResult,
  TrialSample
} from '@/lib/notifications/types'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function deliverToRecipients(options: {
  event: NotificationEvent
  entityKey: string
  recipients: MailRecipient[]
  payload: NotificationPayload
  idempotencyPrefix?: string
}): Promise<{ sent: number; failed: number; skipped: number }> {
  const { event, entityKey, recipients, payload, idempotencyPrefix } = options
  const rendered = renderNotificationEmail(payload)
  let sent = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < recipients.length; i += 1) {
    const recipient = recipients[i]

    const idempotencyKey = idempotencyPrefix
      ? `${idempotencyPrefix}/${recipient.email}`.slice(0, 256)
      : undefined

    const result: SendMailResult = await sendMail({
      to: recipient.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey,
      tags: [
        { name: 'category', value: event },
        { name: 'entity', value: entityKey.slice(0, 100) }
      ]
    })

    await writeNotificationLog({
      event,
      entityKey,
      recipientEmail: recipient.email,
      recipientUserId: recipient.idUser ?? null,
      subject: rendered.subject,
      result
    })

    if (!result.ok) failed += 1
    else if (result.skipped) skipped += 1
    else sent += 1

    // Soft throttle saat banyak penerima
    if (i < recipients.length - 1) await sleep(120)
  }

  return { sent, failed, skipped }
}

function chainForKind(
  kind: DocumentKind,
  ctx: boolean | { isWarranty?: boolean | null; pcrSupplyCategory?: string | null } = false
) {
  if (kind !== 'PCR_FORECAST') return CANNIBAL_BA_APPROVAL_CHAIN

  return getForecastApprovalChain(ctx)
}

export function buildDetailUrl(kind: DocumentKind, documentId: number): string {
  const base = getAppBaseUrl()
  if (kind === 'PCR_FORECAST') return `${base}/approvals/${documentId}`

  return `${base}/cannibals-approvals/${documentId}`
}

export function buildCannibalDetailUrl(idBa: number): string {
  return `${getAppBaseUrl()}/cannibals/${idBa}`
}

export type NotifyPendingInput = {
  kind: DocumentKind
  documentId: number
  documentNo: string
  level: string
  levelLabel?: string | null
  unitNo?: string | null
  projectCode?: string | null
  compDesc?: string | null
  actorName?: string | null

  /** Force project filter for recipients (cannibal PS/PM — BA project only). */
  projectScoped?: boolean

  /** PCR short-chain flags for permission/label lookup (warranty or Repair). */
  isWarranty?: boolean
  pcrSupplyCategory?: string | null
}

export async function notifyApprovalPending(input: NotifyPendingInput) {
  const chain = chainForKind(input.kind, {
    isWarranty: input.isWarranty,
    pcrSupplyCategory: input.pcrSupplyCategory
  })
  const permissionCode = permissionCodeForLevel(chain, input.level)

  const projectScoped =
    input.projectScoped ?? Boolean(chain.levels.find(item => item.level === input.level)?.projectScoped)

  const recipients = await findUsersByPermission(permissionCode, {
    projectCode: projectScoped ? input.projectCode : null
  })

  if (recipients.length === 0) {
    console.warn(`[notifications] no recipients for ${permissionCode}`)

    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload: NotificationPayload = {
    event: 'approval_pending',
    kind: input.kind,
    documentId: input.documentId,
    documentNo: input.documentNo,
    unitNo: input.unitNo,
    projectCode: input.projectCode,
    compDesc: input.compDesc,
    level: input.level,
    levelLabel: input.levelLabel ?? chain.levels.find(l => l.level === input.level)?.label ?? input.level,
    actorName: input.actorName,
    detailUrl: buildDetailUrl(input.kind, input.documentId),
    permissionCode,
    projectScopedCode: projectScoped ? input.projectCode : null
  }

  const entityKey = `approval-pending/${input.kind}/${input.documentId}/${input.level}`

  return deliverToRecipients({
    event: 'approval_pending',
    entityKey,
    recipients,
    payload,
    idempotencyPrefix: entityKey
  })
}

export type NotifyDecisionInput = {
  kind: DocumentKind
  documentId: number
  documentNo: string
  decision: ApprovalDecision
  level: string
  levelLabel?: string | null
  unitNo?: string | null
  projectCode?: string | null
  compDesc?: string | null
  actorName?: string | null
  remark?: string | null
  submitterUserId?: number | null

  /** Extra user ids (e.g. plant submitter). */
  extraRecipientUserIds?: number[]
}

export async function notifyApprovalDecision(input: NotifyDecisionInput) {
  const recipients: MailRecipient[] = []
  const submitter = await findUserRecipientById(input.submitterUserId)
  if (submitter) recipients.push(submitter)

  if (input.extraRecipientUserIds?.length) {
    for (const id of input.extraRecipientUserIds) {
      const user = await findUserRecipientById(id)
      if (user && !recipients.some(r => r.email.toLowerCase() === user.email.toLowerCase())) {
        recipients.push(user)
      }
    }
  }

  if (recipients.length === 0) {
    console.warn('[notifications] no submitter email for approval decision')

    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload: NotificationPayload = {
    event: 'approval_decision',
    kind: input.kind,
    documentId: input.documentId,
    documentNo: input.documentNo,
    unitNo: input.unitNo,
    projectCode: input.projectCode,
    compDesc: input.compDesc,
    level: input.level,
    levelLabel: input.levelLabel,
    actorName: input.actorName,
    remark: input.remark,
    detailUrl: buildDetailUrl(input.kind, input.documentId),
    decision: input.decision,
    submitterUserId: input.submitterUserId
  }

  const entityKey = `approval-decision/${input.kind}/${input.documentId}/${input.decision}/${input.level}`

  return deliverToRecipients({
    event: 'approval_decision',
    entityKey,
    recipients,
    payload,
    idempotencyPrefix: entityKey
  })
}

export type NotifyFullyApprovedInput = {
  kind: DocumentKind
  documentId: number
  documentNo: string
  unitNo?: string | null
  projectCode?: string | null
  compDesc?: string | null
  actorName?: string | null
  submitterUserId?: number | null
}

export async function notifyFullyApproved(input: NotifyFullyApprovedInput) {
  const recipient = await findUserRecipientById(input.submitterUserId)
  if (!recipient) {
    console.warn('[notifications] no submitter email for fully approved')

    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload: NotificationPayload = {
    event: 'fully_approved',
    kind: input.kind,
    documentId: input.documentId,
    documentNo: input.documentNo,
    unitNo: input.unitNo,
    projectCode: input.projectCode,
    compDesc: input.compDesc,
    actorName: input.actorName,
    detailUrl: buildDetailUrl(input.kind, input.documentId),
    submitterUserId: input.submitterUserId
  }

  const entityKey = `fully-approved/${input.kind}/${input.documentId}`

  return deliverToRecipients({
    event: 'fully_approved',
    entityKey,
    recipients: [recipient],
    payload,
    idempotencyPrefix: entityKey
  })
}

export type NotifyCannibalHandoffInput = {
  idBa: number
  documentNo: string
  handoff: HandoffKind
  unitNo?: string | null
  projectCode?: string | null
  actorName?: string | null

  /** Jabatan requestor — dipakai di copy email TO_LOGISTICS. */
  requestorRoleLabel?: string | null

  /** For STATEMENT_CONFIRMED — notify specific users. */
  notifyUserIds?: number[]
}

export async function notifyCannibalHandoff(input: NotifyCannibalHandoffInput) {
  let recipients: MailRecipient[] = []

  if (input.handoff === 'TO_LOGISTICS') {
    recipients = await findUsersByPermission('cannibals.update.logistic')
  } else {
    for (const id of input.notifyUserIds ?? []) {
      const user = await findUserRecipientById(id)
      if (user && !recipients.some(r => r.email.toLowerCase() === user.email.toLowerCase())) {
        recipients.push(user)
      }
    }
  }

  if (recipients.length === 0) {
    console.warn(`[notifications] no recipients for cannibal handoff ${input.handoff}`)

    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload: CannibalHandoffPayload = {
    event: 'cannibal_handoff',
    kind: 'CANNIBAL',
    documentId: input.idBa,
    documentNo: input.documentNo,
    unitNo: input.unitNo,
    projectCode: input.projectCode,
    actorName: input.actorName,
    detailUrl: buildCannibalDetailUrl(input.idBa),
    handoff: input.handoff,
    requestorRoleLabel: input.requestorRoleLabel
  }

  const entityKey = `cannibal-handoff/${input.handoff}/${input.idBa}`

  return deliverToRecipients({
    event: 'cannibal_handoff',
    entityKey,
    recipients,
    payload,
    idempotencyPrefix: entityKey
  })
}

export type NotifyCannibalRequestorInput = {
  idBa: number
  documentNo: string
  event: CannibalRequestorEvent
  unitNo?: string | null
  projectCode?: string | null
  actorName?: string | null
  remark?: string | null
  requestorRole?: string | null
  requestorRoleLabel?: string | null
  requestorName?: string | null
  notifyUserIds: number[]
}

export async function notifyCannibalRequestor(input: NotifyCannibalRequestorInput) {
  const recipients: MailRecipient[] = []

  for (const id of input.notifyUserIds) {
    const user = await findUserRecipientById(id)
    if (user && !recipients.some(r => r.email.toLowerCase() === user.email.toLowerCase())) {
      recipients.push(user)
    }
  }

  if (recipients.length === 0) {
    console.warn(`[notifications] no recipients for ${input.event}`)

    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload: NotificationPayload = {
    event: input.event,
    kind: 'CANNIBAL',
    documentId: input.idBa,
    documentNo: input.documentNo,
    unitNo: input.unitNo,
    projectCode: input.projectCode,
    actorName: input.actorName,
    remark: input.remark,
    detailUrl: buildCannibalDetailUrl(input.idBa),
    requestorRole: input.requestorRole,
    requestorRoleLabel: input.requestorRoleLabel,
    requestorName: input.requestorName
  }

  const entityKey = `${input.event}/${input.idBa}`

  return deliverToRecipients({
    event: input.event,
    entityKey,
    recipients,
    payload,
    idempotencyPrefix: entityKey
  })
}

/** Admin trial — kirim template ke custom email (override recipients). */
export async function sendTrialEmail(options: {
  to: string
  event: NotificationEvent
  sample?: TrialSample
  adminUserId?: number
}): Promise<SendMailResult & { subject?: string }> {
  const to = options.to.trim()
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: { message: 'Invalid email address' } }
  }

  const payload = await (async () => {
    try {
      const { payload: realPayload } = await buildRealisticPreviewPayload(options.event, options.sample)

      return realPayload
    } catch {
      return buildTrialPayload(options.event, options.sample)
    }
  })()
  const rendered = renderNotificationEmail(payload)
  const idempotencyKey = `admin-trial/${options.adminUserId ?? 0}/${Date.now()}`.slice(0, 256)

  const result = await sendMail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey,
    tags: [
      { name: 'category', value: 'admin_trial' },
      { name: 'event', value: options.event }
    ]
  })

  await writeNotificationLog({
    event: options.event,
    entityKey: `admin-trial/${options.event}/${to}`,
    recipientEmail: to,
    recipientUserId: null,
    sentBy: options.adminUserId ?? null,
    subject: rendered.subject,
    result
  })

  return { ...result, subject: rendered.subject }
}

export function notifyApprovalPendingAsync(input: NotifyPendingInput): void {
  fireAndForget(notifyApprovalPending(input), 'approval_pending')
}

export function notifyApprovalDecisionAsync(input: NotifyDecisionInput): void {
  fireAndForget(notifyApprovalDecision(input), 'approval_decision')
}

export function notifyFullyApprovedAsync(input: NotifyFullyApprovedInput): void {
  fireAndForget(notifyFullyApproved(input), 'fully_approved')
}

export function notifyCannibalHandoffAsync(input: NotifyCannibalHandoffInput): void {
  fireAndForget(notifyCannibalHandoff(input), 'cannibal_handoff')
}

export function notifyCannibalRequestorAsync(input: NotifyCannibalRequestorInput): void {
  fireAndForget(notifyCannibalRequestor(input), input.event)
}

export type NotifyCannibalExpiredInput = {
  idBa: number
  documentNo: string
  waitingOn?: string | null
  unitNo?: string | null
  projectCode?: string | null
  notifyUserIds: number[]
}

export async function notifyCannibalExpired(input: NotifyCannibalExpiredInput) {
  const recipients: MailRecipient[] = []
  for (const id of input.notifyUserIds) {
    const user = await findUserRecipientById(id)
    if (user && !recipients.some(r => r.email.toLowerCase() === user.email.toLowerCase())) {
      recipients.push(user)
    }
  }

  if (recipients.length === 0) {
    console.warn(`[notifications] no recipients for cannibal expired ${input.idBa}`)

    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload: CannibalExpiredPayload = {
    event: 'cannibal_expired',
    kind: 'CANNIBAL',
    documentId: input.idBa,
    documentNo: input.documentNo,
    unitNo: input.unitNo,
    projectCode: input.projectCode,
    detailUrl: buildCannibalDetailUrl(input.idBa),
    waitingOn: input.waitingOn
  }

  const entityKey = `cannibal_expired/${input.idBa}`

  return deliverToRecipients({
    event: 'cannibal_expired',
    entityKey,
    recipients,
    payload,
    idempotencyPrefix: entityKey
  })
}

export function notifyCannibalExpiredAsync(input: NotifyCannibalExpiredInput): void {
  fireAndForget(notifyCannibalExpired(input), 'cannibal_expired')
}

/** ISO year-week key for weekly digest idempotency (e.g. 2026-W39). */
export function isoYearWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/** Feature flag — default off until ops enables production Friday cron. */
export function isMaintAchEmailEnabled(): boolean {
  const flag = (process.env.MAINT_ACH_EMAIL_ENABLED ?? 'false').trim().toLowerCase()

  return flag === 'true' || flag === '1' || flag === 'on'
}

export type NotifyMaintenanceAchievementOptions = {
  dryRun?: boolean
  force?: boolean
  year?: number
  month?: number
  day?: number
  projectId?: string | null
}

export type MaintAchSiteSendResult = {
  siteId: string
  skipped?: string
  to: string[]
  cc: string[]
  subject?: string
  result?: SendMailResult
}

/**
 * Weekly Friday job: one email per site with plan &gt; 0.
 * TO = plant site (`maintenance-actual.read`); CC = HO `000H`.
 */
export async function notifyMaintenanceAchievementDigest(
  options: NotifyMaintenanceAchievementOptions = {}
): Promise<{
  enabled: boolean
  weekKey: string
  sites: number
  results: MaintAchSiteSendResult[]
  totals: { sent: number; failed: number; skipped: number }
}> {
  const weekKey = isoYearWeekKey()
  const totals = { sent: 0, failed: 0, skipped: 0 }
  const results: MaintAchSiteSendResult[] = []

  if (!options.force && !options.dryRun && !isMaintAchEmailEnabled()) {
    console.log('[maint-ach] MAINT_ACH_EMAIL_ENABLED=false — skipped')

    return { enabled: false, weekKey, sites: 0, results, totals }
  }

  const now = new Date()
  const year = options.year ?? now.getFullYear()
  const month = options.month ?? now.getMonth() + 1
  const day = options.day ?? now.getDate()

  const achievement = await getFmsAchievement(year, options.projectId?.trim() || null)
  const sites = achievement.siteTotals.filter(s => s.totalPlan > 0)
  const filterSite = options.projectId?.trim() || null
  const siteIds = filterSite
    ? sites.filter(s => s.siteId === filterSite).map(s => s.siteId)
    : sites.map(s => s.siteId)

  for (const siteId of siteIds) {
    const digest = await buildMaintenanceAchievementDigest({ year, month, day, projectId: siteId })
    if (!digest || digest.ytd.plan <= 0) {
      results.push({ siteId, skipped: 'no_plan', to: [], cc: [] })
      totals.skipped += 1
      continue
    }

    const { to, cc } = await findPlantToAndHoCcRecipients('maintenance-actual.read', siteId)
    if (to.length === 0) {
      results.push({
        siteId,
        skipped: 'no_to_recipients',
        to: [],
        cc: cc.map(r => r.email)
      })
      totals.skipped += 1
      continue
    }

    const entityKey = `maintenance_achievement/${weekKey}/${siteId}`
    if (!options.force && !options.dryRun) {
      const already = await prisma.notificationLog.findFirst({
        where: { event: 'maintenance_achievement', dedupeKey: entityKey, status: 'SENT' }
      })
      if (already) {
        results.push({
          siteId,
          skipped: 'already_sent',
          to: to.map(r => r.email),
          cc: cc.map(r => r.email)
        })
        totals.skipped += 1
        continue
      }
    }

    const payload: MaintenanceAchievementPayload = {
      event: 'maintenance_achievement',
      siteId: digest.siteId,
      siteName: digest.siteName,
      year: digest.year,
      month: digest.month,
      periodLabel: digest.periodLabel,
      mtdPeriodLabel: digest.mtdPeriodLabel,
      mtd: digest.mtd,
      ytd: digest.ytd,
      byType: digest.byType.map(row => ({
        typeName: row.typeName,
        mtd: row.mtd,
        ytd: row.ytd
      })),
      belowCritical: digest.belowCritical,
      dashboardUrl: `${getAppBaseUrl()}/dashboards/maintenance?year=${digest.year}&projectId=${encodeURIComponent(
        digest.siteId
      )}`,
      recipientNote: 'Pengiriman terjadwal Jumat: TO Plant site · CC Head Office (000H).'
    }

    const rendered = renderNotificationEmail(payload)

    if (options.dryRun) {
      results.push({
        siteId,
        skipped: 'dry_run',
        to: to.map(r => r.email),
        cc: cc.map(r => r.email),
        subject: rendered.subject
      })
      totals.skipped += 1
      continue
    }

    const result = await sendMail({
      to: to.map(r => r.email),
      cc: cc.map(r => r.email),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: entityKey,
      tags: [
        { name: 'category', value: 'maintenance_achievement' },
        { name: 'site', value: siteId.slice(0, 40) }
      ]
    })

    const logRecipients = [...to, ...cc.filter(c => !to.some(t => t.email.toLowerCase() === c.email.toLowerCase()))]
    for (const recipient of logRecipients) {
      await writeNotificationLog({
        event: 'maintenance_achievement',
        entityKey,
        recipientEmail: recipient.email,
        recipientUserId: recipient.idUser ?? null,
        subject: rendered.subject,
        result
      })
    }

    results.push({
      siteId,
      to: to.map(r => r.email),
      cc: cc.map(r => r.email),
      subject: rendered.subject,
      result
    })

    if (!result.ok) totals.failed += 1
    else if (result.skipped) totals.skipped += 1
    else totals.sent += 1

    await sleep(150)
  }

  return { enabled: true, weekKey, sites: siteIds.length, results, totals }
}

export type { ApprovalChainId }
