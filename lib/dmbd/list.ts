/**
 * Breakdown list for the grid. Latest activity is chosen in memory because
 * MySQL has no cheap "latest child per parent" filter that stays correct when
 * the user filters by position.
 */
import type { Prisma } from '@prisma/client'

import { downtimeHoursFor, latestActivity, statusUnitFor } from '@/lib/dmbd/breakdowns'
import { toWallClockIso } from '@/lib/utils/wall-clock'
import { collapseRepeatedName, nameNeedsLookup } from '@/lib/dmbd/employee-label'
import { breakdownListFilter } from '@/lib/dmbd/list-filter'
import { isBreakdownPosition } from '@/lib/dmbd/payload'
import { lookupEmployeeNames } from '@/lib/dmbd/sap'
import { prisma } from '@/lib/prisma'
import { resolveProjectFilter } from '@/lib/utils/project-scope'
import type { Session } from 'next-auth'

const SORT_FIELDS = new Set([
  'startedAt',
  'finishedAt',
  'workOrder',
  'workOrderStatus',
  'projectCode',
  'hourMeter',
  'registerNo'
])

type ActivityRow = {
  startedAt: Date
  createdAt: Date
  positionStatus: string
  breakdownCode: string
  breakdownCodeName: string
}

function numberOrNull(value: { toString(): string } | null): number | null {
  if (value == null) return null
  const parsed = Number(value.toString())

  return Number.isFinite(parsed) ? parsed : null
}

function toListRow(
  row: {
    id: string
    registerNo: string
    projectCode: string
    fleetUnitId: number
    startedAt: Date
    finishedAt: Date | null
    cancelledAt: Date | null
    problem: string
    hourMeter: { toString(): string } | null
    operatorCode: string | null
    operatorName: string | null
    mechanicLeaderCode: string | null
    mechanicLeaderName: string | null
    remark: string | null
    workOrder: string | null
    workOrderStatus: string
    componentCode: string | null
    componentName: string | null
    fleetUnit: { unitNo: string; modelName: string | null; plantGroup: string | null; plantType: string | null }
    activities: ActivityRow[]
  },
  listNo: number
) {
  const latest = latestActivity(row.activities)

  return {
    id: row.id,
    listNo,
    registerNo: row.registerNo,
    projectCode: row.projectCode,
    fleetUnitId: row.fleetUnitId,
    unitNo: row.fleetUnit.unitNo,
    modelName: row.fleetUnit.modelName,
    plantGroup: row.fleetUnit.plantGroup,
    plantType: row.fleetUnit.plantType,
    startedAt: toWallClockIso(row.startedAt) ?? '',
    finishedAt: toWallClockIso(row.finishedAt),
    problem: row.problem,
    hourMeter: numberOrNull(row.hourMeter),
    operatorCode: row.operatorCode,
    operatorName: row.operatorName,
    mechanicLeaderCode: row.mechanicLeaderCode,
    mechanicLeaderName: row.mechanicLeaderName,
    remark: row.remark,
    workOrder: row.workOrder,
    workOrderStatus: row.workOrderStatus,
    statusUnit: statusUnitFor(row.finishedAt, latest?.positionStatus ?? null, row.cancelledAt),
    downtimeHours: downtimeHoursFor(row.startedAt, row.finishedAt ?? row.cancelledAt),
    cancelledAt: toWallClockIso(row.cancelledAt),
    componentCode: row.componentCode,
    componentName: row.componentName,
    latestPosition: latest?.positionStatus ?? null,
    latestCode: latest?.breakdownCode ?? null,
    latestCodeName: latest?.breakdownCodeName ?? null
  }
}

type BreakdownListQuery = {
  projectCode?: string
  fleetUnitId?: string
  status?: string
  position?: string
  q?: string
  bdFrom?: string
  bdTo?: string
  finishFrom?: string
  finishTo?: string
  description?: string
  sortField: string | null
  sortOrder: 'asc' | 'desc' | null
}

const breakdownInclude = {
  fleetUnit: { select: { unitNo: true, modelName: true, plantGroup: true, plantType: true } },
  activities: {
    select: {
      startedAt: true,
      createdAt: true,
      positionStatus: true,
      breakdownCode: true,
      breakdownCodeName: true
    }
  }
} satisfies Prisma.BreakdownInclude

function breakdownOrderBy(sortField: string | null, sortOrder: 'asc' | 'desc' | null): Prisma.BreakdownOrderByWithRelationInput {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'
  if (sortField === 'unitNo' || sortField === 'modelName') {
    return { fleetUnit: { [sortField]: direction } } as Prisma.BreakdownOrderByWithRelationInput
  }

  const field = sortField && SORT_FIELDS.has(sortField) ? sortField : 'startedAt'

  return { [field]: direction } as Prisma.BreakdownOrderByWithRelationInput
}

/** Shared where and sort for the grid and the Excel export. */
function breakdownListQuery(session: Session, query: BreakdownListQuery) {
  const where: Prisma.BreakdownWhereInput = {
    ...resolveProjectFilter(session, query.projectCode)
  }
  const unitId = Number(query.fleetUnitId)
  if (Number.isInteger(unitId) && unitId > 0) where.fleetUnitId = unitId
  Object.assign(
    where,
    breakdownListFilter({
      status: query.status,
      bdFrom: query.bdFrom,
      bdTo: query.bdTo,
      finishFrom: query.finishFrom,
      finishTo: query.finishTo,
      description: query.description
    })
  )

  const search = query.q?.trim()
  if (search) {
    where.OR = [
      { registerNo: { contains: search } },
      { problem: { contains: search } },
      { remark: { contains: search } },
      { workOrder: { contains: search } },
      { operatorName: { contains: search } },
      { componentCode: { contains: search } },
      { componentName: { contains: search } },
      { fleetUnit: { unitNo: { contains: search } } },
      { fleetUnit: { modelName: { contains: search } } }
    ]
  }

  return { where, orderBy: breakdownOrderBy(query.sortField, query.sortOrder), include: breakdownInclude }
}

/**
 * Filter "status unit" — sama makna kolom STATUS UNIT:
 * CANCEL = cancelledAt; RFU = finish (bukan cancel); BD/OP/SB/AJ = open + latest position.
 */
function matchesStatusUnitFilter(
  row: { finishedAt: Date | null; cancelledAt?: Date | null; activities: ActivityRow[] },
  position: string | undefined
): boolean {
  const wanted = (position || '').trim().toUpperCase()
  if (!wanted) return true
  if (wanted === 'CANCEL') return row.cancelledAt != null
  if (row.cancelledAt) return false
  if (wanted === 'RFU') return row.finishedAt != null
  if (!isBreakdownPosition(wanted)) return true
  if (row.finishedAt) return false

  return latestActivity(row.activities)?.positionStatus === wanted
}

function needsStatusUnitScan(position: string | undefined): boolean {
  const wanted = (position || '').trim().toUpperCase()

  return wanted === 'RFU' || wanted === 'CANCEL' || isBreakdownPosition(wanted)
}

export async function listBreakdowns(session: Session, query: BreakdownListQuery & { page: number; pageSize: number }) {
  const { where, orderBy, include } = breakdownListQuery(session, query)

  if (needsStatusUnitScan(query.position)) {
    const rows = await prisma.breakdown.findMany({ where, orderBy, include })
    const matched = rows.filter(row => matchesStatusUnitFilter(row, query.position))
    const start = query.page * query.pageSize

    return {
      data: await withEmployeeNames(
        matched.slice(start, start + query.pageSize).map((row, index) => toListRow(row, start + index + 1))
      ),
      total: matched.length
    }
  }

  const [total, rows] = await Promise.all([
    prisma.breakdown.count({ where }),
    prisma.breakdown.findMany({
      where,
      orderBy,
      include,
      skip: query.page * query.pageSize,
      take: query.pageSize
    })
  ])

  return {
    data: await withEmployeeNames(rows.map((row, index) => toListRow(row, query.page * query.pageSize + index + 1))),
    total
  }
}

type NamedPerson = {
  operatorCode: string | null
  operatorName: string | null
  mechanicLeaderCode: string | null
  mechanicLeaderName: string | null
}

/** Fill operator and mechanic names when the row only stored the NIK. SAP failure leaves the NIK in place. */
async function withEmployeeNames<T extends NamedPerson>(rows: T[]): Promise<T[]> {
  const codes = rows.flatMap(row => [
    nameNeedsLookup(row.operatorCode, row.operatorName) ? row.operatorCode : null,
    nameNeedsLookup(row.mechanicLeaderCode, row.mechanicLeaderName) ? row.mechanicLeaderCode : null
  ])
  const needed = codes.filter((code): code is string => Boolean(code))
  if (!needed.length) return rows.map(collapseRowNames)

  let names: Map<string, string>
  try {
    names = await lookupEmployeeNames(needed)
  } catch {
    return rows.map(collapseRowNames)
  }

  return rows.map(row => ({
    ...row,
    operatorName: lookedUpName(row.operatorCode, row.operatorName, names),
    mechanicLeaderName: lookedUpName(row.mechanicLeaderCode, row.mechanicLeaderName, names)
  }))
}

function collapseRowNames<T extends NamedPerson>(row: T): T {
  return {
    ...row,
    operatorName: collapseRepeatedName(row.operatorName),
    mechanicLeaderName: collapseRepeatedName(row.mechanicLeaderName)
  }
}

function lookedUpName(code: string | null, name: string | null, names: Map<string, string>): string | null {
  if (!nameNeedsLookup(code, name)) return collapseRepeatedName(name)

  const resolved = names.get((code ?? '').trim()) ?? name

  return collapseRepeatedName(resolved)
}

/** Every matching row for the breakdown report export. Status unit filtered in memory. */
export async function listAllBreakdowns(session: Session, query: BreakdownListQuery) {
  const { where, orderBy, include } = breakdownListQuery(session, query)
  const rows = await prisma.breakdown.findMany({ where, orderBy, include })
  const matched = rows.filter(row => matchesStatusUnitFilter(row, query.position))

  return withEmployeeNames(matched.map((row, index) => toListRow(row, index + 1)))
}

export async function getBreakdownDetail(id: string) {
  const row = await prisma.breakdown.findUnique({
    where: { id },
    include: {
      fleetUnit: { select: { unitNo: true, modelName: true } },
      activities: { orderBy: { startedAt: 'asc' } },
      createdBy: { select: { fullName: true, username: true } }
    }
  })
  if (!row) return null

  const handlerIds = [...new Set(row.activities.map(activity => activity.handledBy).filter((id): id is number => id != null))]

  const handlers = handlerIds.length
    ? await prisma.user.findMany({
        where: { idUser: { in: handlerIds } },
        select: { idUser: true, fullName: true, username: true }
      })
    : []
  const handlerName = new Map(handlers.map(user => [user.idUser, user.fullName || user.username]))

  // Nomor urut pada daftar project ini, urutan yang sama dengan list (start terbaru dulu).
  const listNo =
    (await prisma.breakdown.count({
      where: { projectCode: row.projectCode, startedAt: { gt: row.startedAt } }
    })) + 1

  const detail = {
    listNo,
    id: row.id,
    registerNo: row.registerNo,
    projectCode: row.projectCode,
    fleetUnitId: row.fleetUnitId,
    unitNo: row.fleetUnit.unitNo,
    modelName: row.fleetUnit.modelName,
    startedAt: toWallClockIso(row.startedAt) ?? '',
    finishedAt: toWallClockIso(row.finishedAt),
    cancelledAt: toWallClockIso(row.cancelledAt),
    problem: row.problem,
    resolution: row.resolution,
    hourMeter: numberOrNull(row.hourMeter),
    operatorName: row.operatorName,
    workOrder: row.workOrder,
    sapServiceCallId: row.sapServiceCallId,
    workOrderStatus: row.workOrderStatus,
    componentCode: row.componentCode,
    componentName: row.componentName,
    subComponentCode: row.subComponentCode,
    subComponentName: row.subComponentName,
    damageCode: row.damageCode,
    damageName: row.damageName,
    failureCauseCode: row.failureCauseCode,
    failureCauseName: row.failureCauseName,
    jobCategory: row.jobCategory,
    jobCode: row.jobCode,
    jobCodeName: row.jobCodeName,
    serialNo: row.serialNo,
    location: row.location,
    operatorCode: row.operatorCode,
    mechanicLeaderCode: row.mechanicLeaderCode,
    mechanicLeaderName: row.mechanicLeaderName,
    preparedBy: row.preparedBy,
    assigneeUserId: row.assigneeUserId,
    assigneeName: row.assigneeName,
    remark: row.remark,
    createdByName: row.createdBy.fullName || row.createdBy.username,
    activities: row.activities.map(activity => ({
      id: activity.id,
      sapActivityCode: activity.sapActivityCode,
      activityCategory: activity.activityCategory,
      breakdownCode: activity.breakdownCode,
      breakdownCodeName: activity.breakdownCodeName,
      positionStatus: activity.positionStatus,
      startedAt: toWallClockIso(activity.startedAt) ?? '',
      endedAt: toWallClockIso(activity.endedAt),
      details: activity.details,
      technicianName: activity.technicianName,
      handledBy: activity.handledBy,
      handledByName: activity.handledBy == null ? null : handlerName.get(activity.handledBy) ?? null
    }))
  }

  const [named] = await withEmployeeNames([detail])

  return named
}
