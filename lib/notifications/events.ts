/**
 * Dispatcher notifikasi email — resolve recipients, render template, kirim via SMTP (Nodemailer).
 * Fail-soft: error di-log, tidak throw ke caller bisnis.
 */

import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  PCR_FORECAST_APPROVAL_CHAIN,
  permissionCodeForLevel,
  type ApprovalChainId
} from '@/lib/approval/registry'
import { writeNotificationLog } from '@/lib/notifications/log'
import { fireAndForget, getAppBaseUrl, sendMail } from '@/lib/notifications/mailer'
import { findUserRecipientById, findUsersByPermission } from '@/lib/notifications/recipients'
import { buildRealisticPreviewPayload } from '@/lib/notifications/sample-data'
import { buildTrialPayload, renderNotificationEmail } from '@/lib/notifications/templates'
import type {
  ApprovalDecision,
  CannibalHandoffPayload,
  CannibalRequestorEvent,
  DocumentKind,
  DueBucket,
  DueOverdueItem,
  HandoffKind,
  MailRecipient,
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

function chainForKind(kind: DocumentKind) {
  return kind === 'PCR_FORECAST' ? PCR_FORECAST_APPROVAL_CHAIN : CANNIBAL_BA_APPROVAL_CHAIN
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
  /** Force project filter for recipients (cannibal PS/PM). */
  projectScoped?: boolean
}

export async function notifyApprovalPending(input: NotifyPendingInput) {
  const chain = chainForKind(input.kind)
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

  const entityKey = `approval-decision/${input.kind}/${input.documentId}/${input.decision}/${input.level}/${Date.now()}`

  return deliverToRecipients({
    event: 'approval_decision',
    entityKey,
    recipients,
    payload
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
    idempotencyPrefix: `${entityKey}/${Date.now()}`
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
    idempotencyPrefix: `${entityKey}/${Date.now()}`
  })
}

export type NotifyDueOverdueInput = {
  bucket: DueBucket
  items: DueOverdueItem[]
  permissionCodes: string[]
  projectCode?: string | null
}

export async function notifyDueOverdue(input: NotifyDueOverdueInput) {
  if (input.items.length === 0) return { sent: 0, failed: 0, skipped: 0 }

  const recipients = await findUsersByPermission(input.permissionCodes, {
    projectCode: input.projectCode
  })

  if (recipients.length === 0) {
    console.warn(`[notifications] no recipients for due/overdue ${input.bucket}`)

    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload: NotificationPayload = {
    event: 'due_overdue',
    bucket: input.bucket,
    items: input.items,
    permissionCodes: input.permissionCodes,
    projectCode: input.projectCode
  }

  const day = new Date().toISOString().slice(0, 10)
  const entityKey = `due-overdue/${input.bucket}/${input.projectCode ?? 'all'}/${day}`

  return deliverToRecipients({
    event: 'due_overdue',
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

export type { ApprovalChainId }
