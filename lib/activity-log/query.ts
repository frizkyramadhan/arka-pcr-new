/**
 * Query + cleanup for activity_log (admin list).
 */

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { ActivityAttributeChanges, ActivityLogListItem } from '@/lib/activity-log/types'
import {
  paginatedFindMany,
  parseListPagination,
  resolvePrismaOrderBy
} from '@/lib/utils/list-pagination'

export type ActivityLogListQuery = {
  q?: string
  logName?: string
  event?: string
  subjectType?: string
  causerId?: number

  /** Project / site code — matches properties.projectCode | projectId | planProjectId */
  projectCode?: string
  dateFrom?: string
  dateTo?: string
  pagination: ReturnType<typeof parseListPagination>
}

export type ActivityLogCauserOption = {
  id: number
  fullName: string | null
  username: string | null
}

function parseDateBound(raw: string | null | undefined, endOfDay: boolean): Date | undefined {
  const value = raw?.trim()
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  if (endOfDay) {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }

  return date
}

export function parseActivityLogListQuery(searchParams: URLSearchParams): ActivityLogListQuery {
  const causerRaw = Number(searchParams.get('causerId') ?? '')

  return {
    q: searchParams.get('q')?.trim() || searchParams.get('search')?.trim() || '',
    logName: searchParams.get('logName')?.trim() || '',
    event: searchParams.get('event')?.trim() || '',
    subjectType: searchParams.get('subjectType')?.trim() || '',
    causerId: Number.isFinite(causerRaw) && causerRaw > 0 ? causerRaw : undefined,
    projectCode: searchParams.get('projectCode')?.trim() || '',
    dateFrom: searchParams.get('dateFrom')?.trim() || '',
    dateTo: searchParams.get('dateTo')?.trim() || '',
    pagination: parseListPagination(searchParams)
  }
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  return value as Record<string, unknown>
}

function asChanges(value: Prisma.JsonValue | null): ActivityAttributeChanges | null {
  const record = asRecord(value)
  if (!record) return null

  return {
    attributes: asRecord(record.attributes as Prisma.JsonValue) ?? undefined,
    old: asRecord(record.old as Prisma.JsonValue) ?? undefined
  }
}

function buildActivityLogWhere(query: ActivityLogListQuery): Prisma.ActivityLogWhereInput {
  const where: Prisma.ActivityLogWhereInput = {}
  const and: Prisma.ActivityLogWhereInput[] = []

  if (query.logName) where.logName = query.logName
  if (query.event) where.event = query.event
  if (query.subjectType) where.subjectType = query.subjectType
  if (query.causerId) where.causerId = query.causerId

  const dateFrom = parseDateBound(query.dateFrom, false)
  const dateTo = parseDateBound(query.dateTo, true)
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {})
    }
  }

  if (query.q) {
    and.push({
      OR: [
        { description: { contains: query.q } },
        { event: { contains: query.q } },
        { subjectType: { contains: query.q } },
        { logName: { contains: query.q } },
        { causer: { fullName: { contains: query.q } } },
        { causer: { username: { contains: query.q } } }
      ]
    })
  }

  if (query.projectCode) {
    and.push({
      OR: [
        { properties: { path: '$.projectCode', equals: query.projectCode } },
        { properties: { path: '$.projectId', equals: query.projectCode } },
        { properties: { path: '$.planProjectId', equals: query.projectCode } }
      ]
    })
  }

  if (and.length) where.AND = and

  return where
}

export async function listActivityLogs(query: ActivityLogListQuery) {
  const where = buildActivityLogWhere(query)

  const orderBy = resolvePrismaOrderBy(
    query.pagination,
    {
      createdAt: { createdAt: 'desc' },
      event: { event: 'asc' },
      logName: { logName: 'asc' },
      subjectType: { subjectType: 'asc' }
    },
    { createdAt: 'desc' }
  )

  const result = await paginatedFindMany({
    pagination: query.pagination,
    orderBy,
    count: () => prisma.activityLog.count({ where }),
    findMany: ({ skip, take, orderBy: order }) =>
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: order as Prisma.ActivityLogOrderByWithRelationInput,
        include: {
          causer: { select: { fullName: true, username: true } }
        }
      })
  })

  const rows: ActivityLogListItem[] = result.rows.map(row => ({
    id: row.id,
    logName: row.logName,
    description: row.description,
    event: row.event,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    causerType: row.causerType,
    causerId: row.causerId,
    causerName: row.causer?.fullName ?? null,
    causerUsername: row.causer?.username ?? null,
    attributeChanges: asChanges(row.attributeChanges),
    properties: asRecord(row.properties),
    batchUuid: row.batchUuid,
    createdAt: row.createdAt.toISOString()
  }))

  return { rows, total: result.total }
}

export async function getActivityLogFilterOptions() {
  const [logNames, events, subjectTypes, causerRows] = await Promise.all([
    prisma.activityLog.findMany({
      distinct: ['logName'],
      select: { logName: true },
      where: { logName: { not: null } },
      orderBy: { logName: 'asc' }
    }),
    prisma.activityLog.findMany({
      distinct: ['event'],
      select: { event: true },
      where: { event: { not: null } },
      orderBy: { event: 'asc' }
    }),
    prisma.activityLog.findMany({
      distinct: ['subjectType'],
      select: { subjectType: true },
      where: { subjectType: { not: null } },
      orderBy: { subjectType: 'asc' }
    }),
    prisma.activityLog.findMany({
      distinct: ['causerId'],
      where: { causerId: { not: null } },
      select: {
        causerId: true,
        causer: { select: { fullName: true, username: true } }
      },
      orderBy: { causerId: 'asc' }
    })
  ])

  const causers: ActivityLogCauserOption[] = causerRows
    .filter(row => row.causerId != null)
    .map(row => ({
      id: row.causerId as number,
      fullName: row.causer?.fullName ?? null,
      username: row.causer?.username ?? null
    }))
    .sort((a, b) => {
      const left = (a.fullName || a.username || String(a.id)).toLowerCase()
      const right = (b.fullName || b.username || String(b.id)).toLowerCase()

      return left.localeCompare(right)
    })

  return {
    logNames: logNames.map(row => row.logName).filter(Boolean) as string[],
    events: events.map(row => row.event).filter(Boolean) as string[],
    subjectTypes: subjectTypes.map(row => row.subjectType).filter(Boolean) as string[],
    causers
  }
}

/** Hapus log lebih tua dari N hari (Spatie `activitylog:clean`). */
export async function cleanActivityLogs(olderThanDays = 365): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const result = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } }
  })

  return result.count
}
