import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { attributeChanges, logActivity } from '@/lib/activity-log'
import { normalizeEvalCodeForStorage } from '@/lib/ratings'
import { ensureEquipmentCache } from '@/lib/hour-meter/service'
import { prisma } from '@/lib/prisma'
import { SOS_DECIMAL_FIELDS } from '@/lib/sos/field-groups'
import type { SosCreateInput, SosUpdateInput } from '@/lib/validations/sos'
import { getPrismaProjectFilter, resolveProjectFilter } from '@/lib/utils/project-scope'
import { appendSearchWhere } from '@/lib/utils/list-search'

export type SosListFilters = {
  fleetUnitId?: number | null
  idMod?: number | null
  evalCode?: string | null
  projectCode?: string | null
  sampleDateFrom?: string | null
  sampleDateTo?: string | null
  search?: string | null
}

const sosInclude = {
  commod: { include: { comp: true } },
  unit: true
} satisfies Prisma.SosInclude

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

function buildListWhere(session: Session, filters: SosListFilters): Prisma.SosWhereInput {
  const where: Prisma.SosWhereInput = {
    deletedAt: null,
    ...resolveProjectFilter(session, filters.projectCode)
  }

  if (filters.fleetUnitId) where.fleetUnitId = filters.fleetUnitId
  if (filters.idMod) where.idMod = filters.idMod
  if (filters.evalCode) where.evalCode = filters.evalCode

  const sampleDateFrom = parseOptionalDate(filters.sampleDateFrom)
  const sampleDateTo = parseOptionalDate(filters.sampleDateTo)

  if (sampleDateFrom || sampleDateTo) {
    where.sampleDate = {
      ...(sampleDateFrom ? { gte: sampleDateFrom } : {}),
      ...(sampleDateTo ? { lte: sampleDateTo } : {})
    }
  }

  return appendSearchWhere(where, filters.search, [
    { unitNo: { contains: filters.search ?? '' } },
    { labNo: { contains: filters.search ?? '' } },
    { evalCode: { contains: filters.search ?? '' } },
    { projectCode: { contains: filters.search ?? '' } },
    { commod: { comp: { compDesc: { contains: filters.search ?? '' } } } }
  ])
}

function mapSosData(input: SosCreateInput | SosUpdateInput): Prisma.SosUncheckedCreateInput {
  const data: Record<string, unknown> = { ...input }

  for (const key of SOS_DECIMAL_FIELDS) {
    const value = data[key]
    if (value === '' || value === undefined) {
      data[key] = null
    }
  }

  if (typeof data.evalCode === 'string') {
    data.evalCode = normalizeEvalCodeForStorage(data.evalCode) ?? data.evalCode
  }

  if (data.oilChange === null || data.oilChange === undefined) data.oilChange = false
  if ('oilChange' in data && !data.oilChange) data.oilAdded = null

  return data as Prisma.SosUncheckedCreateInput
}

export async function listSosRecords(session: Session, filters: SosListFilters = {}) {
  return prisma.sos.findMany({
    where: buildListWhere(session, filters),
    include: sosInclude,
    orderBy: [{ sampleDate: 'desc' }, { unitNo: 'asc' }, { idSos: 'desc' }]
  })
}

export type PaginatedResult<T> = {
  total: number
  rows: T[]
}

type SosListQuery = {
  page: number
  pageSize: number
  sortField?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

function buildSosOrderBy(sortField?: string | null, sortOrder?: 'asc' | 'desc' | null): Prisma.SosOrderByWithRelationInput[] {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'
  const defaultOrder: Prisma.SosOrderByWithRelationInput[] = [
    { sampleDate: 'desc' },
    { unitNo: 'asc' },
    { idSos: 'desc' }
  ]

  if (!sortField) return defaultOrder

  switch (sortField) {
    case 'unitNo':
      return [{ unitNo: direction }, { sampleDate: 'desc' }, { idSos: direction }]
    case 'projectCode':
      return [{ projectCode: direction }, { sampleDate: 'desc' }, { unitNo: 'asc' }, { idSos: direction }]
    case 'evalCode':
      return [{ evalCode: direction }, { sampleDate: 'desc' }, { unitNo: 'asc' }, { idSos: direction }]
    case 'sampleDate':
      return [{ sampleDate: direction }, { unitNo: 'asc' }, { idSos: direction }]
    case 'labNo':
      return [{ labNo: direction }, { sampleDate: 'desc' }, { unitNo: 'asc' }, { idSos: direction }]
    case 'idSos':
      return [{ idSos: direction }]
    case 'compDesc':
      return [
        { commod: { comp: { compDesc: direction } } },
        { sampleDate: 'desc' },
        { unitNo: 'asc' },
        { idSos: direction }
      ]
    default:
      return defaultOrder
  }
}

export async function listSosRecordsPaginated(
  session: Session,
  filters: SosListFilters = {},
  query: SosListQuery
): Promise<PaginatedResult<Prisma.SosGetPayload<{ include: typeof sosInclude }>>> {
  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0
  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 10

  const where = buildListWhere(session, filters)
  const orderBy = buildSosOrderBy(query.sortField, query.sortOrder)

  const [total, rows] = await Promise.all([
    prisma.sos.count({ where }),
    prisma.sos.findMany({
      where,
      include: sosInclude,
      orderBy,
      skip: page * pageSize,
      take: pageSize
    })
  ])

  return { total, rows }
}

export async function getSosById(session: Session, idSos: number) {
  return prisma.sos.findFirst({
    where: {
      idSos,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: sosInclude
  })
}

export async function createSosRecord(session: Session, input: SosCreateInput, createdBy?: number) {
  const equipment = await ensureEquipmentCache(input.fleetUnitId, session)

  const commod = await prisma.commod.findFirst({
    where: { idMod: input.idMod, fleetModelId: equipment.fleetModelId }
  })

  if (!commod) {
    throw new Error('Component policy not found for this equipment model')
  }

  const payload = mapSosData(input)

  const row = await prisma.sos.create({
    data: {
      ...payload,
      fleetUnitId: equipment.fleetUnitId,
      idMod: input.idMod,
      sampleDate: input.sampleDate,
      type: input.type ?? 'SOS',
      unitNo: equipment.unitNo,
      projectCode: equipment.projectCode,
      createdBy: createdBy ?? null
    },
    include: sosInclude
  })

  const { recomputeConditionForComponent } = await import('@/lib/condition/service')
  await recomputeConditionForComponent(equipment.fleetUnitId, input.idMod)

  logActivity({
    session,
    logName: 'sos',
    event: 'created',
    description: `created SOS ${row.unitNo} — ${row.commod?.comp?.compDesc ?? 'component'}`,
    subjectType: 'Sos',
    subjectId: row.idSos,
    properties: {
      unitNo: row.unitNo,
      projectCode: row.projectCode,
      idMod: row.idMod,
      evalCode: row.evalCode,
      sampleDate: row.sampleDate,
      type: row.type,
      compDesc: row.commod?.comp?.compDesc ?? null
    }
  })

  return row
}

export async function updateSosRecord(session: Session, idSos: number, input: SosUpdateInput) {
  const existing = await getSosById(session, idSos)
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

  const payload = mapSosData(input)

  const row = await prisma.sos.update({
    where: { idSos },
    data: {
      ...payload,
      fleetUnitId,
      idMod,
      unitNo,
      projectCode,
      snapshotAt: new Date()
    },
    include: sosInclude
  })

  const { recomputeConditionForComponent } = await import('@/lib/condition/service')
  await recomputeConditionForComponent(fleetUnitId, idMod)

  if (existing.fleetUnitId !== fleetUnitId || existing.idMod !== idMod) {
    await recomputeConditionForComponent(existing.fleetUnitId, existing.idMod)
  }

  logActivity({
    session,
    logName: 'sos',
    event: 'updated',
    description: `updated SOS ${row.unitNo} — ${row.commod?.comp?.compDesc ?? 'component'}`,
    subjectType: 'Sos',
    subjectId: idSos,
    properties: {
      unitNo: row.unitNo,
      projectCode: row.projectCode,
      idMod: row.idMod,
      evalCode: row.evalCode,
      sampleDate: row.sampleDate,
      type: row.type,
      compDesc: row.commod?.comp?.compDesc ?? null
    },
    attributeChanges: attributeChanges(
      {
        unitNo: existing.unitNo,
        idMod: existing.idMod,
        evalCode: existing.evalCode,
        sampleDate: existing.sampleDate,
        type: existing.type
      },
      {
        unitNo: row.unitNo,
        idMod: row.idMod,
        evalCode: row.evalCode,
        sampleDate: row.sampleDate,
        type: row.type
      }
    )
  })

  return row
}

export async function deleteSosRecord(session: Session, idSos: number) {
  const existing = await getSosById(session, idSos)
  if (!existing) return null

  await prisma.sos.update({
    where: { idSos },
    data: { deletedAt: new Date() }
  })

  const { recomputeConditionForComponent } = await import('@/lib/condition/service')
  await recomputeConditionForComponent(existing.fleetUnitId, existing.idMod)

  logActivity({
    session,
    logName: 'sos',
    event: 'deleted',
    description: `deleted SOS ${existing.unitNo}`,
    subjectType: 'Sos',
    subjectId: idSos,
    properties: {
      unitNo: existing.unitNo,
      projectCode: existing.projectCode,
      idMod: existing.idMod,
      evalCode: existing.evalCode,
      type: existing.type
    }
  })

  return { success: true }
}
