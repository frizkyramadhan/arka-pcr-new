/**
 * Cannibal dashboard stats — pipeline KPIs with legacy status normalization.
 * OPEN + L1/L2/L3 APPROVED counts as closed (migrated BA), not in-approval.
 */

import type { Session } from 'next-auth'

import { getPendingLevelForBa, isBaFullyApproved } from '@/lib/cannibal/approval-workflow'
import { BA_APPROVAL_LEVELS } from '@/lib/cannibal/types'
import {
  classifyCannibalBa,
  postingYearRange,
  type CannibalPipelineBucket
} from '@/lib/dashboard/cannibal-status'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { getPrismaProjectFilter } from '@/lib/utils/project-scope'

export type CannibalStatusCounts = {
  draft: number
  pendingLogistics: number
  pendingDocument: number
  inApproval: number
  approved: number
  rejected: number
  closed: number
  cancelled: number
  /** Non-cancelled BA in selected posting year */
  totalActive: number
}

export type CannibalDashboardStats = {
  year: number
  /** Distinct posting years available for this session's project scope (DESC). */
  availableYears: number[]
  pendingBaApprovals: Record<(typeof BA_APPROVAL_LEVELS)[number], number>
  cannibalAwaitingApproval: number
  statusCounts: CannibalStatusCounts
  statusMix: Array<{ status: string; count: number }>
  recentOpen: Array<{
    idBa: number
    noBa: string | null
    projectCode: string
    statusBa: string
    postingDate: string | null
  }>
}

const EMPTY_COUNTS = (): CannibalStatusCounts => ({
  draft: 0,
  pendingLogistics: 0,
  pendingDocument: 0,
  inApproval: 0,
  approved: 0,
  rejected: 0,
  closed: 0,
  cancelled: 0,
  totalActive: 0
})

const MIX_LABEL: Record<CannibalPipelineBucket, string> = {
  draft: 'DRAFT',
  pendingLogistics: 'PENDING_LOGISTICS',
  pendingDocument: 'PENDING_DOCUMENT',
  inApproval: 'IN_APPROVAL',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  closed: 'CLOSED',
  cancelled: 'CANCELLED'
}

/** Distinct posting years for BA within the user's project scope. */
export async function listCannibalPostingYears(session: Session): Promise<number[]> {
  const projectFilter = getPrismaProjectFilter(session)
  const rows = await prisma.ba.findMany({
    where: { deletedAt: null, ...projectFilter },
    select: { postingDate: true },
    distinct: ['postingDate'],
    orderBy: { postingDate: 'desc' }
  })

  const years = new Set<number>()
  for (const row of rows) {
    if (!row.postingDate) continue
    const iso = toIsoDateOnly(row.postingDate)
    if (!iso) continue
    years.add(Number(iso.slice(0, 4)))
  }

  const current = new Date().getFullYear()
  years.add(current)

  return [...years].filter(y => Number.isFinite(y)).sort((a, b) => b - a)
}

/**
 * Aggregate cannibal BA operational KPIs for the selected posting-date year.
 */
export async function getCannibalDashboardStats(
  session: Session,
  year?: number
): Promise<CannibalDashboardStats> {
  const targetYear = year && !Number.isNaN(year) ? year : new Date().getFullYear()
  const projectFilter = getPrismaProjectFilter(session)
  const postingWhere = {
    deletedAt: null,
    postingDate: postingYearRange(targetYear),
    ...projectFilter
  }

  const [availableYears, yearRows, approvalRows, recentRows] = await Promise.all([
    listCannibalPostingYears(session),
    prisma.ba.findMany({
      where: postingWhere,
      select: {
        statusBa: true,
        statusL1: true,
        statusL2: true,
        statusL3: true
      }
    }),
    prisma.ba.findMany({
      where: {
        deletedAt: null,
        postingDate: postingYearRange(targetYear),
        statusBa: { in: ['SUBMITTED', 'OPEN'] },
        ...projectFilter
      },
      select: {
        statusBa: true,
        statusL1: true,
        statusL2: true,
        statusL3: true,
        projectCode: true,
        approvals: { select: { level: true, status: true } }
      }
    }),
    prisma.ba.findMany({
      where: {
        deletedAt: null,
        postingDate: postingYearRange(targetYear),
        statusBa: {
          in: ['DRAFT', 'PENDING_LOGISTICS', 'PENDING_DOCUMENT', 'SUBMITTED', 'OPEN', 'APPROVED', 'REJECTED']
        },
        ...projectFilter
      },
      select: {
        idBa: true,
        noBa: true,
        projectCode: true,
        statusBa: true,
        statusL1: true,
        statusL2: true,
        statusL3: true,
        postingDate: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 40
    })
  ])

  const statusCounts = EMPTY_COUNTS()
  const mixMap = new Map<string, number>()

  for (const row of yearRows) {
    const bucket = classifyCannibalBa(row)
    statusCounts[bucket] += 1
    if (bucket !== 'cancelled') statusCounts.totalActive += 1

    const label = MIX_LABEL[bucket]
    mixMap.set(label, (mixMap.get(label) ?? 0) + 1)
  }

  const pendingBaApprovals = Object.fromEntries(BA_APPROVAL_LEVELS.map(level => [level, 0])) as Record<
    (typeof BA_APPROVAL_LEVELS)[number],
    number
  >

  let cannibalAwaitingApproval = 0
  for (const row of approvalRows) {
    // Skip legacy OPEN that already completed L1–L3 — not a live approval queue item
    if (classifyCannibalBa(row) !== 'inApproval') continue

    cannibalAwaitingApproval += 1
    const pendingLevel = getPendingLevelForBa(row)
    if (pendingLevel) pendingBaApprovals[pendingLevel] += 1
    else if (!isBaFullyApproved(row.approvals)) {
      // Legacy row without modern approval rows — still count in awaiting total above
    }
  }

  const statusMix = [...mixMap.entries()]
    .filter(([status]) => status !== 'CANCELLED')
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  const recentOpen = recentRows
    .filter(row => {
      const bucket = classifyCannibalBa(row)

      return (
        bucket === 'draft' ||
        bucket === 'pendingLogistics' ||
        bucket === 'pendingDocument' ||
        bucket === 'inApproval' ||
        bucket === 'approved' ||
        bucket === 'rejected'
      )
    })
    .slice(0, 10)
    .map(row => ({
      idBa: row.idBa,
      noBa: row.noBa,
      projectCode: row.projectCode,
      statusBa: row.statusBa,
      postingDate: row.postingDate ? toIsoDateOnly(row.postingDate) : null
    }))

  return {
    year: targetYear,
    availableYears,
    pendingBaApprovals,
    cannibalAwaitingApproval,
    statusCounts,
    statusMix,
    recentOpen
  }
}
