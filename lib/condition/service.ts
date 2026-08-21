import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { logActivity } from '@/lib/activity-log'
import {
  computeOverallCondition,
  normalizeInspectionRating,
  pickDisplaySosRating,
  type SourceRatings
} from '@/lib/condition/aggregate'
import type { InspectionTypeCode } from '@/lib/inspection/types'
import { normalizeEvalCodeForStorage } from '@/lib/ratings'
import { ensureEquipmentCache } from '@/lib/hour-meter/service'
import { prisma } from '@/lib/prisma'
import { getPrismaProjectFilter, resolveProjectFilter } from '@/lib/utils/project-scope'
import { appendSearchWhere } from '@/lib/utils/list-search'

export type ConditionListFilters = {
  fleetUnitId?: number | null
  idMod?: number | null
  condition?: string | null
  projectCode?: string | null
  sosRating?: string | null
  evaluatedAtFrom?: string | null
  evaluatedAtTo?: string | null
  search?: string | null
}

const conditionInclude = {
  commod: { include: { comp: true } },
  unit: true
} satisfies Prisma.ConditionInclude

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

function buildListWhere(session: Session, filters: ConditionListFilters): Prisma.ConditionWhereInput {
  const where: Prisma.ConditionWhereInput = {
    deletedAt: null,
    ...resolveProjectFilter(session, filters.projectCode)
  }

  if (filters.fleetUnitId) where.fleetUnitId = filters.fleetUnitId
  if (filters.idMod) where.idMod = filters.idMod
  if (filters.condition) where.condition = filters.condition
  if (filters.sosRating) where.sosRating = filters.sosRating

  const evaluatedAtFrom = parseOptionalDate(filters.evaluatedAtFrom)
  const evaluatedAtTo = parseOptionalDate(filters.evaluatedAtTo)

  if (evaluatedAtFrom || evaluatedAtTo) {
    where.evaluatedAt = {
      ...(evaluatedAtFrom ? { gte: evaluatedAtFrom } : {}),
      ...(evaluatedAtTo ? { lte: evaluatedAtTo } : {})
    }
  }

  return appendSearchWhere(where, filters.search, [
    { unitNo: { contains: filters.search ?? '' } },
    { condition: { contains: filters.search ?? '' } },
    { projectCode: { contains: filters.search ?? '' } },
    { sosRating: { contains: filters.search ?? '' } },
    { fcRating: { contains: filters.search ?? '' } },
    { mpsRating: { contains: filters.search ?? '' } },
    { viRating: { contains: filters.search ?? '' } },
    { ta2Rating: { contains: filters.search ?? '' } },
    { edRating: { contains: filters.search ?? '' } },
    { commod: { comp: { compDesc: { contains: filters.search ?? '' } } } }
  ])
}

async function fetchLatestSosByType(fleetUnitId: number, idMod: number) {
  const typeRows = await prisma.sos.findMany({
    where: { fleetUnitId, idMod, deletedAt: null },
    distinct: ['type'],
    select: { type: true }
  })

  if (typeRows.length === 0) return []

  const rows = await Promise.all(
    typeRows.map(({ type }) =>
      prisma.sos.findFirst({
        where: { fleetUnitId, idMod, type, deletedAt: null },
        orderBy: [{ sampleDate: 'desc' }, { idSos: 'desc' }],
        select: { evalCode: true, type: true }
      })
    )
  )

  return rows.filter((row): row is NonNullable<typeof row> => row !== null)
}

async function fetchLatestSourceRatings(fleetUnitId: number, idMod: number): Promise<SourceRatings> {
  const [sosRows, latestFc, latestMps, latestVi, latestTa2, latestEd] = await Promise.all([
    fetchLatestSosByType(fleetUnitId, idMod),
    prisma.inspection.findFirst({
      where: { fleetUnitId, idMod, type: 'FC', deletedAt: null },
      orderBy: [{ insDate: 'desc' }, { idIns: 'desc' }]
    }),
    prisma.inspection.findFirst({
      where: { fleetUnitId, idMod, type: 'MPS', deletedAt: null },
      orderBy: [{ insDate: 'desc' }, { idIns: 'desc' }]
    }),
    prisma.inspection.findFirst({
      where: { fleetUnitId, idMod, type: 'VI', deletedAt: null },
      orderBy: [{ insDate: 'desc' }, { idIns: 'desc' }]
    }),
    prisma.inspection.findFirst({
      where: { fleetUnitId, idMod, type: 'TA2', deletedAt: null },
      orderBy: [{ insDate: 'desc' }, { idIns: 'desc' }]
    }),
    prisma.inspection.findFirst({
      where: { fleetUnitId, idMod, type: 'ED', deletedAt: null },
      orderBy: [{ insDate: 'desc' }, { idIns: 'desc' }]
    })
  ])

  const sosCodes = sosRows
    .map(row => normalizeEvalCodeForStorage(row.evalCode))
    .filter((code): code is NonNullable<typeof code> => code !== null)

  return {
    sosRating: pickDisplaySosRating(sosRows.map(row => row.evalCode)),
    sosCodes,
    fcRating: normalizeInspectionRating(latestFc?.rating),
    mpsRating: normalizeInspectionRating(latestMps?.rating),
    viRating: normalizeInspectionRating(latestVi?.rating),
    ta2Rating: normalizeInspectionRating(latestTa2?.rating),
    edRating: normalizeInspectionRating(latestEd?.rating)
  }
}

export async function recomputeConditionForComponent(fleetUnitId: number, idMod: number) {
  const equipment = await prisma.fleetUnitCache.findUnique({ where: { fleetUnitId } })
  if (!equipment) return null

  const commod = await prisma.commod.findFirst({
    where: { idMod, fleetModelId: equipment.fleetModelId }
  })

  if (!commod) return null

  const sourceRatings = await fetchLatestSourceRatings(fleetUnitId, idMod)

  const hasAnySource = Object.values({
    sos: sourceRatings.sosRating,
    fc: sourceRatings.fcRating,
    mps: sourceRatings.mpsRating,
    vi: sourceRatings.viRating,
    ta2: sourceRatings.ta2Rating,
    ed: sourceRatings.edRating
  }).some(value => value !== null)

  if (!hasAnySource) {
    await prisma.condition.updateMany({
      where: { fleetUnitId, idMod, deletedAt: null },
      data: { deletedAt: new Date() }
    })

    return null
  }

  const overall = computeOverallCondition(sourceRatings)
  if (!overall) return null

  return prisma.condition.upsert({
    where: {
      fleetUnitId_idMod: { fleetUnitId, idMod }
    },
    create: {
      fleetUnitId,
      idMod,
      condition: overall,
      sosRating: sourceRatings.sosRating,
      fcRating: sourceRatings.fcRating,
      mpsRating: sourceRatings.mpsRating,
      viRating: sourceRatings.viRating,
      ta2Rating: sourceRatings.ta2Rating,
      edRating: sourceRatings.edRating,
      evaluatedAt: new Date(),
      unitNo: equipment.unitNo,
      projectCode: equipment.projectCode
    },
    update: {
      condition: overall,
      sosRating: sourceRatings.sosRating,
      fcRating: sourceRatings.fcRating,
      mpsRating: sourceRatings.mpsRating,
      viRating: sourceRatings.viRating,
      ta2Rating: sourceRatings.ta2Rating,
      edRating: sourceRatings.edRating,
      evaluatedAt: new Date(),
      unitNo: equipment.unitNo,
      projectCode: equipment.projectCode,
      snapshotAt: new Date(),
      deletedAt: null
    },
    include: conditionInclude
  })
}

export async function recomputeConditionsForEquipment(fleetUnitId: number) {
  const equipment = await prisma.fleetUnitCache.findUnique({ where: { fleetUnitId } })
  if (!equipment) return []

  const commods = await prisma.commod.findMany({ where: { fleetModelId: equipment.fleetModelId } })
  const results = []

  for (const commod of commods) {
    const row = await recomputeConditionForComponent(fleetUnitId, commod.idMod)
    if (row) results.push(row)
  }

  return results
}

export async function recomputeConditionAfterInspectionChange(
  fleetUnitId: number,
  idMod: number,
  _type?: InspectionTypeCode
) {
  return recomputeConditionForComponent(fleetUnitId, idMod)
}

export async function listConditionRecords(session: Session, filters: ConditionListFilters = {}) {
  return prisma.condition.findMany({
    where: buildListWhere(session, filters),
    include: conditionInclude,
    orderBy: [{ evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: 'desc' }]
  })
}

export type PaginatedResult<T> = {
  total: number
  rows: T[]
}

type ConditionListQuery = {
  page: number
  pageSize: number
  sortField?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

function buildConditionOrderBy(sortField?: string | null, sortOrder?: 'asc' | 'desc' | null): Prisma.ConditionOrderByWithRelationInput[] {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'

  const defaultOrder: Prisma.ConditionOrderByWithRelationInput[] = [
    { evaluatedAt: 'desc' },
    { unitNo: 'asc' },
    { idCondition: 'desc' }
  ]

  if (!sortField) return defaultOrder

  switch (sortField) {
    case 'unitNo':
      return [{ unitNo: direction }, { evaluatedAt: 'desc' }, { idCondition: direction }]
    case 'condition':
      return [{ condition: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'sosRating':
      return [{ sosRating: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'fcRating':
      return [{ fcRating: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'mpsRating':
      return [{ mpsRating: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'viRating':
      return [{ viRating: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'ta2Rating':
      return [{ ta2Rating: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'edRating':
      return [{ edRating: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'evaluatedAt':
      return [{ evaluatedAt: direction }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'projectCode':
      return [{ projectCode: direction }, { evaluatedAt: 'desc' }, { unitNo: 'asc' }, { idCondition: direction }]
    case 'compDesc':
      return [
        { commod: { comp: { compDesc: direction } } },
        { evaluatedAt: 'desc' },
        { unitNo: 'asc' },
        { idCondition: direction }
      ]
    default:
      return defaultOrder
  }
}

export async function listConditionRecordsPaginated(
  session: Session,
  filters: ConditionListFilters = {},
  query: ConditionListQuery
): Promise<PaginatedResult<Prisma.ConditionGetPayload<{ include: typeof conditionInclude }>>> {
  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0

  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 10

  const where = buildListWhere(session, filters)
  const orderBy = buildConditionOrderBy(query.sortField, query.sortOrder)

  const [total, rows] = await Promise.all([
    prisma.condition.count({ where }),
    prisma.condition.findMany({
      where,
      include: conditionInclude,
      orderBy,
      skip: page * pageSize,
      take: pageSize
    })
  ])

  return { total, rows }
}

export async function getConditionByComponent(session: Session, fleetUnitId: number, idMod: number) {
  return prisma.condition.findFirst({
    where: {
      fleetUnitId,
      idMod,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: conditionInclude
  })
}

export async function ensureEquipmentAndRecompute(session: Session, fleetUnitId: number) {
  const equipment = await ensureEquipmentCache(fleetUnitId, session)
  const rows = await recomputeConditionsForEquipment(fleetUnitId)

  logActivity({
    session,
    logName: 'conditions',
    event: 'updated',
    description: `recomputed condition for unit ${equipment.unitNo}`,
    subjectType: 'Condition',
    subjectId: rows[0]?.idCondition ?? null,
    properties: {
      fleetUnitId,
      unitNo: equipment.unitNo,
      projectCode: equipment.projectCode,
      recomputed: rows.length
    }
  })

  return rows
}
