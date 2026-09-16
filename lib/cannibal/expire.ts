/**
 * Expire cannibal BAs that passed the 5×24h overall SLA from Plant Submit.
 * Email Plant once per BA (notification idempotency). Safe to call on list/get and a light tick.
 */
import { buildCannibalSlaSnapshot, CANNIBAL_SLA_MS, CANNIBAL_SLA_TRACKED_STATUSES, isCannibalOverallExpired } from '@/lib/cannibal/sla'
import { notifyCannibalExpiredAsync } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'

const EXPIRE_BATCH = 50

const expireInclude = {
  requestor: { select: { fullName: true, username: true } },
  approvals: { select: { level: true, status: true } },
  kanibals: {
    where: { deletedAt: null },
    take: 1,
    select: { unitNo: true },
    orderBy: { idKanibal: 'asc' as const }
  }
} as const

type ExpireCandidate = {
  idBa: number
  noBa: string
  statusBa: string
  projectCode: string
  plantSubmittedBy: number | null
  createdBy: number | null
  plantSubmittedAt: Date | null
  requestedConfirmedAt: Date | null
  statementConfirmedAt: Date | null
  approvalSubmittedAt: Date | null
  expiredAt: Date | null
  expiredFromStatus: string | null
  cannibalRequestRole: string | null
  requestor: { fullName: string | null; username: string | null } | null
  approvals: Array<{ level: string; status: string }>
  kanibals: Array<{ unitNo: string | null }>
}

function plantNotifyUserIds(row: ExpireCandidate): number[] {
  return [row.plantSubmittedBy, row.createdBy]
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0)
}

async function markExpired(row: ExpireCandidate, now: Date) {
  const sla = buildCannibalSlaSnapshot(row, now)

  const result = await prisma.ba.updateMany({
    where: {
      idBa: row.idBa,
      statusBa: row.statusBa,
      deletedAt: null
    },
    data: {
      statusBa: 'EXPIRED',
      expiredAt: now,
      expiredFromStatus: row.statusBa
    }
  })

  if (result.count === 0) return false

  notifyCannibalExpiredAsync({
    idBa: row.idBa,
    documentNo: row.noBa,
    waitingOn: sla.waitingOn,
    unitNo: row.kanibals[0]?.unitNo ?? null,
    projectCode: row.projectCode,
    notifyUserIds: plantNotifyUserIds(row)
  })

  return true
}

export async function expireOverdueCannibalBas(now = new Date()): Promise<number> {
  const deadline = new Date(now.getTime() - CANNIBAL_SLA_MS.TOTAL)

  const due = (await prisma.ba.findMany({
    where: {
      deletedAt: null,
      statusBa: { in: [...CANNIBAL_SLA_TRACKED_STATUSES] },
      plantSubmittedAt: { lte: deadline }
    },
    take: EXPIRE_BATCH,
    include: expireInclude
  })) as ExpireCandidate[]

  let expired = 0
  for (const row of due) {
    if (!isCannibalOverallExpired(row, now)) continue
    if (await markExpired(row, now)) expired += 1
  }

  return expired
}

export async function expireCannibalBaIfDue(idBa: number, now = new Date()): Promise<void> {
  const row = (await prisma.ba.findFirst({
    where: { idBa, deletedAt: null },
    include: expireInclude
  })) as ExpireCandidate | null

  if (!row || !isCannibalOverallExpired(row, now)) return
  if (!CANNIBAL_SLA_TRACKED_STATUSES.includes(row.statusBa as (typeof CANNIBAL_SLA_TRACKED_STATUSES)[number])) return

  await markExpired(row, now)
}
