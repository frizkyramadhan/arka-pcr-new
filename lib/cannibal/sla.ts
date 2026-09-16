/**
 * Cannibal BA SLA — clock starts at Plant Submit (PENDING_REQUESTOR), not draft create.
 * Stage windows: Request By / Logistic / Plant dokumentasi 1×24h; approval 2×24h; overall 5×24h.
 */
import { CANNIBAL_BA_APPROVAL_CHAIN, getChainLevelOrder } from '@/lib/approval/registry'
import { getCannibalApprovalLabel } from '@/lib/cannibal/approval-labels'
import { CANNIBAL_REQUEST_ROLE_LABELS, isCannibalRequestRole } from '@/lib/cannibal/requestor-roles'

const APPROVAL_LEVEL_ORDER = getChainLevelOrder(CANNIBAL_BA_APPROVAL_CHAIN)

function pendingApprovalLevel(approvals: Array<{ level: string; status: string }> | undefined): string | null {
  const byLevel = new Map((approvals ?? []).map(row => [row.level, row.status]))

  for (let index = 0; index < APPROVAL_LEVEL_ORDER.length; index += 1) {
    const level = APPROVAL_LEVEL_ORDER[index]
    if (byLevel.get(level) !== 'PENDING') continue
    const priorsApproved = APPROVAL_LEVEL_ORDER.slice(0, index).every(prev => byLevel.get(prev) === 'APPROVED')
    if (priorsApproved) return level
  }

  return null
}

export const DAY_MS = 24 * 60 * 60 * 1000

export const CANNIBAL_SLA_MS = {
  PENDING_REQUESTOR: 1 * DAY_MS,
  PENDING_LOGISTICS: 1 * DAY_MS,
  PENDING_DOCUMENT: 1 * DAY_MS,
  APPROVAL: 2 * DAY_MS,
  TOTAL: 5 * DAY_MS
} as const

export const CANNIBAL_SLA_TRACKED_STATUSES = [
  'PENDING_REQUESTOR',
  'PENDING_LOGISTICS',
  'PENDING_DOCUMENT',
  'SUBMITTED',
  'OPEN'
] as const

export type CannibalSlaTrackedStatus = (typeof CANNIBAL_SLA_TRACKED_STATUSES)[number]

export const CANNIBAL_EXPIRED_MESSAGE = 'This BA has expired. Reopen it to continue, or submit a new BA.'

export type CannibalExpiredReopenPatch = {
  statusBa: CannibalSlaTrackedStatus
  plantSubmittedAt: Date
  expiredAt: null
  expiredFromStatus: null
  requestedConfirmedAt?: Date
  statementConfirmedAt?: Date
  approvalSubmittedAt?: Date
}

/** Restore expired BA to its last stage and restart the 5-day clock from `now`. */
export function buildExpiredReopenPatch(fromStatus: string | null | undefined, now = new Date()): CannibalExpiredReopenPatch {
  if (!isCannibalSlaTrackedStatus(fromStatus)) {
    throw new Error('Cannot reopen: original workflow stage is missing')
  }

  const patch: CannibalExpiredReopenPatch = {
    statusBa: fromStatus,
    plantSubmittedAt: now,
    expiredAt: null,
    expiredFromStatus: null
  }

  if (fromStatus === 'PENDING_LOGISTICS') {
    patch.requestedConfirmedAt = now
  }

  if (fromStatus === 'PENDING_DOCUMENT') {
    patch.statementConfirmedAt = now
  }

  if (fromStatus === 'SUBMITTED' || fromStatus === 'OPEN') {
    patch.approvalSubmittedAt = now
  }

  return patch
}

export type CannibalSlaStageKey = 'requestor' | 'logistics' | 'documentation' | 'approval'

export type CannibalSlaInput = {
  statusBa?: string | null
  plantSubmittedAt?: Date | string | null
  requestedConfirmedAt?: Date | string | null
  statementConfirmedAt?: Date | string | null
  approvalSubmittedAt?: Date | string | null
  expiredAt?: Date | string | null
  expiredFromStatus?: string | null
  cannibalRequestRole?: string | null
  requestor?: { fullName?: string | null; username?: string | null } | null
  approvals?: Array<{ level: string; status: string }>
}

export type CannibalSlaSnapshot = {
  tracked: boolean
  expired: boolean
  waitingOn: string | null
  stageKey: CannibalSlaStageKey | null
  stageLabel: string | null
  stageStartedAt: string | null
  stageDeadline: string | null
  overallStartedAt: string | null
  overallDeadline: string | null
}

export function isCannibalSlaTrackedStatus(status: string | null | undefined): status is CannibalSlaTrackedStatus {
  return Boolean(status && (CANNIBAL_SLA_TRACKED_STATUSES as readonly string[]).includes(status))
}

export function assertCannibalNotExpired(statusBa: string | null | undefined) {
  if (statusBa === 'EXPIRED') {
    throw new Error(CANNIBAL_EXPIRED_MESSAGE)
  }
}

export function toSlaDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

/** Status used for waiting/stage after expire (original workflow status). */
export function slaWorkflowStatus(ba: CannibalSlaInput): string | null {
  if (ba.statusBa === 'EXPIRED') return ba.expiredFromStatus ?? null

  return ba.statusBa ?? null
}

function requestorDisplayName(ba: CannibalSlaInput): string | null {
  const name = ba.requestor?.fullName?.trim() || ba.requestor?.username?.trim()

  const role = isCannibalRequestRole(ba.cannibalRequestRole)
    ? CANNIBAL_REQUEST_ROLE_LABELS[ba.cannibalRequestRole]
    : null
  if (role && name) return `Request By (${role} — ${name})`
  if (role) return `Request By (${role})`
  if (name) return `Request By (${name})`

  return 'Request By'
}

export function resolveCannibalWaitingOn(ba: CannibalSlaInput): string | null {
  const status = slaWorkflowStatus(ba)
  if (!status) return null

  if (status === 'PENDING_REQUESTOR') return requestorDisplayName(ba)
  if (status === 'PENDING_LOGISTICS') return 'Logistic'
  if (status === 'PENDING_DOCUMENT') return 'Plant (Record & Documentation)'
  if (status === 'SUBMITTED' || status === 'OPEN') {
    const level = pendingApprovalLevel(ba.approvals)
    if (level) return `Approval (${getCannibalApprovalLabel(level)})`

    return 'Approval'
  }

  return null
}

function firstTimestamp(...values: Array<Date | string | null | undefined>): Date | null {
  for (const value of values) {
    const date = toSlaDate(value)
    if (date) return date
  }

  return null
}

export function resolveCannibalSlaStage(ba: CannibalSlaInput): {
  key: CannibalSlaStageKey
  label: string
  startedAt: Date
  durationMs: number
} | null {
  const status = slaWorkflowStatus(ba)
  const plantSubmittedAt = toSlaDate(ba.plantSubmittedAt)
  if (!status || !plantSubmittedAt) return null

  if (status === 'PENDING_REQUESTOR') {
    return {
      key: 'requestor',
      label: 'Request By',
      startedAt: plantSubmittedAt,
      durationMs: CANNIBAL_SLA_MS.PENDING_REQUESTOR
    }
  }

  if (status === 'PENDING_LOGISTICS') {
    return {
      key: 'logistics',
      label: 'Logistic',
      startedAt: firstTimestamp(ba.requestedConfirmedAt, ba.plantSubmittedAt) ?? plantSubmittedAt,
      durationMs: CANNIBAL_SLA_MS.PENDING_LOGISTICS
    }
  }

  if (status === 'PENDING_DOCUMENT') {
    return {
      key: 'documentation',
      label: 'Record & Documentation',
      startedAt:
        firstTimestamp(ba.statementConfirmedAt, ba.requestedConfirmedAt, ba.plantSubmittedAt) ?? plantSubmittedAt,
      durationMs: CANNIBAL_SLA_MS.PENDING_DOCUMENT
    }
  }

  if (status === 'SUBMITTED' || status === 'OPEN') {
    return {
      key: 'approval',
      label: 'Approval',
      startedAt:
        firstTimestamp(ba.approvalSubmittedAt, ba.statementConfirmedAt, ba.requestedConfirmedAt, ba.plantSubmittedAt) ??
        plantSubmittedAt,
      durationMs: CANNIBAL_SLA_MS.APPROVAL
    }
  }

  return null
}

export function isCannibalOverallExpired(ba: CannibalSlaInput, now = new Date()): boolean {
  if (ba.statusBa === 'EXPIRED' || toSlaDate(ba.expiredAt)) return true
  if (!isCannibalSlaTrackedStatus(ba.statusBa ?? null)) return false
  const start = toSlaDate(ba.plantSubmittedAt)
  if (!start) return false

  return now.getTime() >= start.getTime() + CANNIBAL_SLA_MS.TOTAL
}

export function buildCannibalSlaSnapshot(ba: CannibalSlaInput, now = new Date()): CannibalSlaSnapshot {
  const overallStart = toSlaDate(ba.plantSubmittedAt)
  const expired = isCannibalOverallExpired(ba, now)
  const workflowStatus = slaWorkflowStatus(ba)
  const tracked = Boolean(overallStart && (expired || isCannibalSlaTrackedStatus(workflowStatus)))
  const stage = tracked ? resolveCannibalSlaStage(ba) : null
  const overallDeadline = overallStart ? new Date(overallStart.getTime() + CANNIBAL_SLA_MS.TOTAL) : null
  const stageDeadline = stage ? new Date(stage.startedAt.getTime() + stage.durationMs) : null

  return {
    tracked,
    expired,
    waitingOn: tracked ? resolveCannibalWaitingOn(ba) : null,
    stageKey: stage?.key ?? null,
    stageLabel: stage?.label ?? null,
    stageStartedAt: toIso(stage?.startedAt ?? null),
    stageDeadline: toIso(stageDeadline),
    overallStartedAt: toIso(overallStart),
    overallDeadline: toIso(overallDeadline)
  }
}

export function formatDurationMs(ms: number): string {
  const abs = Math.max(0, Math.round(ms))
  const days = Math.floor(abs / DAY_MS)
  const hours = Math.floor((abs % DAY_MS) / (60 * 60 * 1000))
  const minutes = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000))

  if (days > 0) {
    return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`
  }
  if (hours > 0) {
    return minutes > 0 && hours < 3 ? `${hours} jam ${minutes} menit` : `${hours} jam`
  }
  if (minutes > 0) return `${minutes} menit`

  return '< 1 menit'
}

export function formatCannibalRemaining(
  deadlineIso: string | null | undefined,
  now = new Date()
): { text: string; overdue: boolean; remainingMs: number | null } {
  const deadline = toSlaDate(deadlineIso)
  if (!deadline) {
    return { text: '—', overdue: false, remainingMs: null }
  }

  const remainingMs = deadline.getTime() - now.getTime()
  if (remainingMs < 0) {
    return { text: `Lewat ${formatDurationMs(-remainingMs)}`, overdue: true, remainingMs }
  }

  return { text: `Sisa ${formatDurationMs(remainingMs)}`, overdue: false, remainingMs }
}
