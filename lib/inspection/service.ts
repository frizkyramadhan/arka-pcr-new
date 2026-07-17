import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { recomputeConditionAfterInspectionChange } from '@/lib/condition/service'
import { normalizeInspectionRating } from '@/lib/condition/aggregate'
import type { InspectionTypeCode } from '@/lib/inspection/types'
import { ensureEquipmentCache } from '@/lib/hour-meter/service'
import { prisma } from '@/lib/prisma'
import type { InspectionCreateInput, InspectionUpdateInput } from '@/lib/validations/inspection'
import { getPrismaProjectFilter, resolveProjectFilter } from '@/lib/utils/project-scope'
import { appendSearchWhere } from '@/lib/utils/list-search'

export type InspectionListFilters = {
  fleetUnitId?: number | null
  idMod?: number | null
  type?: string | null
  rating?: string | null
  projectCode?: string | null
  insDateFrom?: string | null
  insDateTo?: string | null
  search?: string | null
}

const inspectionInclude = {
  commod: { include: { comp: true } },
  unit: true
} satisfies Prisma.InspectionInclude

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

function buildListWhere(session: Session, filters: InspectionListFilters): Prisma.InspectionWhereInput {
  const where: Prisma.InspectionWhereInput = {
    deletedAt: null,
    ...resolveProjectFilter(session, filters.projectCode)
  }

  if (filters.fleetUnitId) where.fleetUnitId = filters.fleetUnitId
  if (filters.idMod) where.idMod = filters.idMod
  if (filters.type) where.type = filters.type
  if (filters.rating) where.rating = filters.rating

  const insDateFrom = parseOptionalDate(filters.insDateFrom)
  const insDateTo = parseOptionalDate(filters.insDateTo)

  if (insDateFrom || insDateTo) {
    where.insDate = {
      ...(insDateFrom ? { gte: insDateFrom } : {}),
      ...(insDateTo ? { lte: insDateTo } : {})
    }
  }

  return appendSearchWhere(where, filters.search, [
    { unitNo: { contains: filters.search ?? '' } },
    { type: { contains: filters.search ?? '' } },
    { rating: { contains: filters.search ?? '' } },
    { projectCode: { contains: filters.search ?? '' } },
    { commod: { comp: { compDesc: { contains: filters.search ?? '' } } } }
  ])
}

function mapInspectionData(
  input: InspectionCreateInput | InspectionUpdateInput
): Prisma.InspectionUncheckedCreateInput {
  const data: Record<string, unknown> = { ...input }

  if (typeof data.rating === 'string') {
    data.rating = normalizeInspectionRating(data.rating) ?? data.rating
  }

  if (data.insHm === '' || data.insHm === undefined) {
    data.insHm = null
  }

  return data as Prisma.InspectionUncheckedCreateInput
}

export async function listInspectionRecords(session: Session, filters: InspectionListFilters = {}) {
  return prisma.inspection.findMany({
    where: buildListWhere(session, filters),
    include: inspectionInclude,
    orderBy: [{ insDate: 'desc' }, { unitNo: 'asc' }, { idIns: 'desc' }]
  })
}

export type PaginatedResult<T> = {
  total: number
  rows: T[]
}

type InspectionListQuery = {
  page: number
  pageSize: number
  sortField?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

function buildInspectionOrderBy(sortField?: string | null, sortOrder?: 'asc' | 'desc' | null): Prisma.InspectionOrderByWithRelationInput[] {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'
  const defaultOrder: Prisma.InspectionOrderByWithRelationInput[] = [
    { insDate: 'desc' },
    { unitNo: 'asc' },
    { idIns: 'desc' }
  ]

  if (!sortField) return defaultOrder

  switch (sortField) {
    case 'unitNo':
      return [{ unitNo: direction }, { insDate: 'desc' }, { idIns: direction }]
    case 'idIns':
      return [{ idIns: direction }]
    case 'type':
      return [{ type: direction }, { insDate: 'desc' }, { unitNo: 'asc' }, { idIns: direction }]
    case 'rating':
      return [{ rating: direction }, { insDate: 'desc' }, { unitNo: 'asc' }, { idIns: direction }]
    case 'insDate':
      return [{ insDate: direction }, { unitNo: 'asc' }, { idIns: direction }]
    case 'insHm':
      return [{ insHm: direction }, { insDate: 'desc' }, { unitNo: 'asc' }, { idIns: direction }]
    case 'projectCode':
      return [{ projectCode: direction }, { insDate: 'desc' }, { unitNo: 'asc' }, { idIns: direction }]
    case 'compDesc':
      return [
        { commod: { comp: { compDesc: direction } } },
        { insDate: 'desc' },
        { unitNo: 'asc' },
        { idIns: direction }
      ]
    default:
      return defaultOrder
  }
}

export async function listInspectionRecordsPaginated(
  session: Session,
  filters: InspectionListFilters = {},
  query: InspectionListQuery
): Promise<PaginatedResult<Prisma.InspectionGetPayload<{ include: typeof inspectionInclude }>>> {
  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0
  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 10

  const where = buildListWhere(session, filters)
  const orderBy = buildInspectionOrderBy(query.sortField, query.sortOrder)

  const [total, rows] = await Promise.all([
    prisma.inspection.count({ where }),
    prisma.inspection.findMany({
      where,
      include: inspectionInclude,
      orderBy,
      skip: page * pageSize,
      take: pageSize
    })
  ])

  return { total, rows }
}

export async function getInspectionById(session: Session, idIns: number) {
  return prisma.inspection.findFirst({
    where: {
      idIns,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: inspectionInclude
  })
}

export async function createInspectionRecord(session: Session, input: InspectionCreateInput, createdBy?: number) {
  const equipment = await ensureEquipmentCache(input.fleetUnitId, session)

  const commod = await prisma.commod.findFirst({
    where: { idMod: input.idMod, fleetModelId: equipment.fleetModelId }
  })

  if (!commod) {
    throw new Error('Component policy not found for this equipment model')
  }

  const payload = mapInspectionData(input)

  const row = await prisma.inspection.create({
    data: {
      ...payload,
      fleetUnitId: equipment.fleetUnitId,
      idMod: input.idMod,
      type: input.type,
      insDate: input.insDate,
      rating: input.rating,
      unitNo: equipment.unitNo,
      projectCode: equipment.projectCode,
      createdBy: createdBy ?? null
    },
    include: inspectionInclude
  })

  await recomputeConditionAfterInspectionChange(equipment.fleetUnitId, input.idMod, input.type as InspectionTypeCode)

  return row
}

export async function updateInspectionRecord(session: Session, idIns: number, input: InspectionUpdateInput) {
  const existing = await getInspectionById(session, idIns)
  if (!existing) return null

  let unitNo = existing.unitNo
  let projectCode = existing.projectCode
  let fleetUnitId = existing.fleetUnitId
  let idMod = existing.idMod

  if (input.fleetUnitId && input.fleetUnitId !== existing.fleetUnitId) {
    const equipment = await ensureEquipmentCache(input.fleetUnitId, session)
    fleetUnitId = equipment.fleetUnitId
    unitNo = equipment.unitNo
    projectCode = equipment.projectCode
  }

  if (input.idMod) idMod = input.idMod

  const payload = mapInspectionData(input)

  const row = await prisma.inspection.update({
    where: { idIns },
    data: {
      ...payload,
      fleetUnitId,
      idMod,
      unitNo,
      projectCode,
      snapshotAt: new Date()
    },
    include: inspectionInclude
  })

  await recomputeConditionAfterInspectionChange(fleetUnitId, idMod, (input.type ?? existing.type) as InspectionTypeCode)

  const typeChanged = input.type != null && input.type !== existing.type
  const locationChanged = existing.fleetUnitId !== fleetUnitId || existing.idMod !== idMod

  if (locationChanged || typeChanged) {
    await recomputeConditionAfterInspectionChange(
      existing.fleetUnitId,
      existing.idMod,
      existing.type as InspectionTypeCode
    )
  }

  return row
}

export async function deleteInspectionRecord(session: Session, idIns: number) {
  const existing = await getInspectionById(session, idIns)
  if (!existing) return null

  await prisma.inspection.update({
    where: { idIns },
    data: { deletedAt: new Date() }
  })

  await recomputeConditionAfterInspectionChange(
    existing.fleetUnitId,
    existing.idMod,
    existing.type as InspectionTypeCode
  )

  return { success: true }
}
