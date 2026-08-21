/**
 * Tipe event & payload notifikasi email ARKA PCR (Nodemailer SMTP).
 */

export const NOTIFICATION_EVENTS = [
  'approval_pending',
  'approval_decision',
  'fully_approved',
  'cannibal_handoff',
  'cannibal_requestor_pending',
  'cannibal_requestor_confirmed',
  'cannibal_requestor_rejected',
  'due_overdue',
  'plain_ping'
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

export type DocumentKind = 'PCR_FORECAST' | 'CANNIBAL'

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'REVOKED'

export type HandoffKind = 'TO_LOGISTICS' | 'STATEMENT_CONFIRMED'

export type CannibalRequestorEvent =
  | 'cannibal_requestor_pending'
  | 'cannibal_requestor_confirmed'
  | 'cannibal_requestor_rejected'

export type DueBucket = 'DUE' | 'OVERDUE'

export type MailRecipient = {
  idUser?: number
  email: string
  fullName?: string | null
}

export type DocumentContext = {
  kind: DocumentKind

  /** Primary id for deep link (idBaPcr for forecast, idBa for cannibal). */
  documentId: number
  documentNo: string
  unitNo?: string | null
  projectCode?: string | null
  compDesc?: string | null
  level?: string | null
  levelLabel?: string | null
  actorName?: string | null
  remark?: string | null
  detailUrl: string
}

export type ApprovalPendingPayload = DocumentContext & {
  event: 'approval_pending'
  permissionCode: string

  /** When set, restrict recipients to this project (cannibal PS/PM). */
  projectScopedCode?: string | null
}

export type ApprovalDecisionPayload = DocumentContext & {
  event: 'approval_decision'
  decision: ApprovalDecision
  submitterUserId?: number | null
}

export type FullyApprovedPayload = DocumentContext & {
  event: 'fully_approved'
  submitterUserId?: number | null
}

export type CannibalHandoffPayload = DocumentContext & {
  event: 'cannibal_handoff'
  handoff: HandoffKind

  /** Jabatan requestor (untuk copy email logistics setelah confirm). */
  requestorRoleLabel?: string | null
}

/** Cannibal Request By gate — Plant → requestor confirm/reject → Logistics. */
export type CannibalRequestorPayload = DocumentContext & {
  event: CannibalRequestorEvent
  requestorRole?: string | null
  requestorRoleLabel?: string | null
  requestorName?: string | null
}

export type DueOverdueItem = {
  idForecast: number
  unitNo: string
  projectCode: string
  compDesc: string | null
  lifePercent: number
  bucket: DueBucket
  detailUrl: string
}

export type DueOverduePayload = {
  event: 'due_overdue'
  bucket: DueBucket
  items: DueOverdueItem[]

  /** Permission codes used to resolve recipients. */
  permissionCodes: string[]
  projectCode?: string | null
}

export type PlainPingPayload = {
  event: 'plain_ping'
  message?: string
}

export type NotificationPayload =
  | ApprovalPendingPayload
  | ApprovalDecisionPayload
  | FullyApprovedPayload
  | CannibalHandoffPayload
  | CannibalRequestorPayload
  | DueOverduePayload
  | PlainPingPayload

export type TrialSample = {
  documentNo?: string
  level?: string
  unitNo?: string
  projectCode?: string
  compDesc?: string
  actorName?: string
  remark?: string
  message?: string
}

export type SendMailResult =
  | { ok: true; id: string | null; skipped?: boolean; reason?: string }
  | { ok: false; error: { message: string; name?: string } }
