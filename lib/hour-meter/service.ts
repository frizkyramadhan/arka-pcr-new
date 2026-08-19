import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { attributeChanges, logActivity } from '@/lib/activity-log'
import { getUnitForSession, listUnitsForSession } from '@/lib/fleet-api/equipment-service'
import { prisma } from '@/lib/prisma'
import type { HourMeterInput } from '@/lib/validations/hour-meter'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/list-pagination'
import { canAccessProject, getPrismaProjectFilter, isHeadOffice } from '@/lib/utils/project-scope'

export type HourMeterListFilters = {
  fleetUnitId?: number | null
  projectCode?: string | null
  search?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  hmUnitMin?: number | null
  hmUnitMax?: number | null
}

export type HourMeterListQuery = HourMeterListFilters & {
  sortField: 'idHm' | 'unitNo' | 'equipmentDescription' | 'projectCode' | 'hmUnit' | 'whDay' | 'dateHm'
  sortOrder: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

const HM_SORT_FIELDS = [
  'idHm',
  'unitNo',
  'equipmentDescription',
  'projectCode',
  'hmUnit',
  'whDay',
  'dateHm'
] as const

const hmInclude = {
  unit: {
    select: {
      unitNo: true,
      description: true,
      modelName: true,
      projectCode: true
    }
  }
} satisfies Prisma.HmInclude

type HourMeterRow = Prisma.HmGetPayload<{ include: typeof hmInclude }>

function parseOptionalNumber(value: string | null): number | null {
  if (!value?.trim()) return null
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return null

  return parsed
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value?.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

export function buildListWhere(session: Session, filters: HourMeterListFilters): Prisma.HmWhereInput {
  const where: Prisma.HmWhereInput = {
    deletedAt: null,
    ...getPrismaProjectFilter(session)
  }

  if (filters.fleetUnitId) {
    where.fleetUnitId = filters.fleetUnitId
  }

  if (isHeadOffice(session) && filters.projectCode) {
    where.projectCode = filters.projectCode
  }

  if (filters.search) {
    where.unitNo = { contains: filters.search }
  }

  const dateFrom = parseOptionalDate(filters.dateFrom ?? null)
  const dateTo = parseOptionalDate(filters.dateTo ?? null)

  if (dateFrom || dateTo) {
    where.dateHm = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {})
    }
  }

  const hmUnitMin = filters.hmUnitMin
  const hmUnitMax = filters.hmUnitMax

  if (hmUnitMin != null || hmUnitMax != null) {
    where.hmUnit = {
      ...(hmUnitMin != null ? { gte: hmUnitMin } : {}),
      ...(hmUnitMax != null ? { lte: hmUnitMax } : {})
    }
  }

  return where
}

function buildOrderBy(query: HourMeterListQuery): Prisma.HmOrderByWithRelationInput[] {
  const direction = query.sortOrder

  if (query.sortField === 'idHm') {
    return [{ idHm: direction }]
  }

  if (query.sortField === 'equipmentDescription') {
    return [{ unit: { description: direction } }, { idHm: direction }]
  }

  if (query.sortField === 'dateHm') {
    return [{ dateHm: direction }, { idHm: direction }]
  }

  return [{ [query.sortField]: direction }, { idHm: direction }]
}

export async function listHourMeters(session: Session, filters: HourMeterListFilters = {}) {
  return prisma.hm.findMany({
    where: buildListWhere(session, filters),
    include: hmInclude,
    orderBy: [{ idHm: 'desc' }]
  })
}

export function parseHourMeterListQuery(searchParams: URLSearchParams): HourMeterListQuery {
  const sortFieldRaw = searchParams.get('column') ?? searchParams.get('sortField') ?? 'idHm'
  const sortField = HM_SORT_FIELDS.includes(sortFieldRaw as (typeof HM_SORT_FIELDS)[number])
    ? (sortFieldRaw as HourMeterListQuery['sortField'])
    : 'idHm'

  const sortOrderRaw = searchParams.get('sort') ?? searchParams.get('sortOrder') ?? 'desc'
  const fleetUnitIdRaw = searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
  const search = searchParams.get('search')?.trim() ?? searchParams.get('q')?.trim() ?? ''
  const pageRaw = searchParams.get('page')
  const pageSizeRaw = searchParams.get('pageSize')

  return {
    fleetUnitId: fleetUnitIdRaw ? Number(fleetUnitIdRaw) : null,
    projectCode: searchParams.get('projectCode'),
    search: search || null,
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    hmUnitMin: parseOptionalNumber(searchParams.get('hmUnitMin')),
    hmUnitMax: parseOptionalNumber(searchParams.get('hmUnitMax')),
    sortField,
    sortOrder: sortOrderRaw === 'desc' ? 'desc' : 'asc',
    page: pageRaw ? Number(pageRaw) : 0,
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : DEFAULT_PAGE_SIZE
  }
}

/** Paginated list — SQL skip/take (for large hm tables). */
export async function listHourMetersQuery(
  session: Session,
  query: HourMeterListQuery
): Promise<{ total: number; data: HourMeterRow[]; page: number; pageSize: number }> {
  const where = buildListWhere(session, query)
  const page = Number.isFinite(query.page) && (query.page ?? 0) >= 0 ? Math.floor(query.page ?? 0) : 0
  const pageSize = Math.min(Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1), 100)

  const [total, data] = await Promise.all([
    prisma.hm.count({ where }),
    prisma.hm.findMany({
      where,
      include: hmInclude,
      orderBy: buildOrderBy(query),
      skip: page * pageSize,
      take: pageSize
    })
  ])

  return { total, data, page, pageSize }
}

async function ensureUnitCache(fleetUnitId: number, session: Session) {
  const existing = await prisma.fleetUnitCache.findUnique({
    where: { fleetUnitId }
  })

  if (!existing) {
    throw new Error('Unit not found in local cache. Sync units from the Units page.')
  }

  if (!canAccessProject(session, existing.projectCode)) {
    throw new Error('Equipment not found or not in your project scope')
  }

  return existing
}

export async function getHourMeterById(session: Session, idHm: number) {
  return prisma.hm.findFirst({
    where: {
      idHm,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: hmInclude
  })
}

/** Termasuk soft-deleted — dipakai import untuk restore baris yang pernah dihapus. */
export async function getHourMeterByIdIncludingDeleted(session: Session, idHm: number) {
  return prisma.hm.findFirst({
    where: {
      idHm,
      ...getPrismaProjectFilter(session)
    },
    include: hmInclude
  })
}

export async function findHourMeterByUnitAndDate(session: Session, fleetUnitId: number, dateHm: Date) {
  return prisma.hm.findFirst({
    where: {
      fleetUnitId,
      dateHm,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    }
  })
}

/** Termasuk soft-deleted — hindari duplikat tersembunyi saat import. */
export async function findHourMeterByUnitAndDateIncludingDeleted(
  session: Session,
  fleetUnitId: number,
  dateHm: Date
) {
  return prisma.hm.findFirst({
    where: {
      fleetUnitId,
      dateHm,
      ...getPrismaProjectFilter(session)
    },
    orderBy: { idHm: 'desc' }
  })
}

export async function upsertHourMeterFromImport(
  session: Session,
  input: HourMeterInput,
  options: { idHm?: number | null; createdBy?: number } = {}
) {
  if (options.idHm) {
    const existing = await getHourMeterByIdIncludingDeleted(session, options.idHm)
    if (!existing) {
      throw new Error(`Hour meter id ${options.idHm} not found`)
    }

    const wasDeleted = existing.deletedAt != null
    const updated = await updateHourMeter(session, options.idHm, input, {
      restore: wasDeleted,
      skipActivityLog: true
    })
    if (!updated) {
      throw new Error(`Hour meter id ${options.idHm} not found`)
    }

    return { action: wasDeleted ? ('restored' as const) : ('updated' as const), row: updated }
  }

  const existing = await findHourMeterByUnitAndDateIncludingDeleted(
    session,
    input.fleetUnitId,
    input.dateHm
  )
  if (existing) {
    const wasDeleted = existing.deletedAt != null
    const updated = await updateHourMeter(session, existing.idHm, input, {
      restore: wasDeleted,
      skipActivityLog: true
    })
    if (!updated) {
      throw new Error('Failed to update existing hour meter')
    }

    return { action: wasDeleted ? ('restored' as const) : ('updated' as const), row: updated }
  }

  const created = await createHourMeter(session, input, options.createdBy, { skipActivityLog: true })

  return { action: 'created' as const, row: created }
}

export async function createHourMeter(
  session: Session,
  input: HourMeterInput,
  createdBy?: number,
  options: { skipActivityLog?: boolean } = {}
) {
  const equipment = await ensureUnitCache(input.fleetUnitId, session)

  const row = await prisma.hm.create({
    data: {
      fleetUnitId: equipment.fleetUnitId,
      hmUnit: input.hmUnit,
      whDay: input.whDay,
      dateHm: input.dateHm,
      unitNo: equipment.unitNo,
      projectCode: equipment.projectCode,
      createdBy: createdBy ?? null
    },
    include: hmInclude
  })

  if (!options.skipActivityLog) {
    logActivity({
      session,
      logName: 'hour-meters',
      event: 'created',
      description: `created hour meter ${row.unitNo}`,
      subjectType: 'HourMeter',
      subjectId: row.idHm,
      properties: {
        unitNo: row.unitNo,
        projectCode: row.projectCode,
        hmUnit: Number(row.hmUnit),
        whDay: row.whDay != null ? Number(row.whDay) : null,
        dateHm: row.dateHm
      }
    })
  }

  return row
}

export async function updateHourMeter(
  session: Session,
  idHm: number,
  input: Partial<HourMeterInput>,
  options: { restore?: boolean; skipActivityLog?: boolean } = {}
) {
  const existing = options.restore
    ? await getHourMeterByIdIncludingDeleted(session, idHm)
    : await getHourMeterById(session, idHm)
  if (!existing) return null

  let unitNo = existing.unitNo
  let projectCode = existing.projectCode
  let fleetUnitId = existing.fleetUnitId

  if (input.fleetUnitId && input.fleetUnitId !== existing.fleetUnitId) {
    const equipment = await ensureUnitCache(input.fleetUnitId, session)
    unitNo = equipment.unitNo
    projectCode = equipment.projectCode
    fleetUnitId = equipment.fleetUnitId
  }

  const row = await prisma.hm.update({
    where: { idHm },
    data: {
      fleetUnitId,
      hmUnit: input.hmUnit,
      whDay: input.whDay,
      dateHm: input.dateHm,
      unitNo,
      projectCode,
      snapshotAt: new Date(),
      ...(options.restore ? { deletedAt: null } : {})
    },
    include: hmInclude
  })

  if (!options.skipActivityLog) {
    logActivity({
      session,
      logName: 'hour-meters',
      event: 'updated',
      description: options.restore
        ? `restored hour meter ${row.unitNo}`
        : `updated hour meter ${row.unitNo}`,
      subjectType: 'HourMeter',
      subjectId: idHm,
      properties: {
        unitNo: row.unitNo,
        projectCode: row.projectCode,
        hmUnit: Number(row.hmUnit),
        whDay: row.whDay != null ? Number(row.whDay) : null,
        dateHm: row.dateHm,
        restored: Boolean(options.restore)
      },
      attributeChanges: attributeChanges(
        {
          unitNo: existing.unitNo,
          hmUnit: existing.hmUnit,
          whDay: existing.whDay,
          dateHm: existing.dateHm
        },
        {
          unitNo: row.unitNo,
          hmUnit: row.hmUnit,
          whDay: row.whDay,
          dateHm: row.dateHm
        }
      )
    })
  }

  return row
}

export async function deleteHourMeter(session: Session, idHm: number) {
  const existing = await getHourMeterById(session, idHm)
  if (!existing) return null

  await prisma.hm.update({
    where: { idHm },
    data: { deletedAt: new Date() }
  })

  logActivity({
    session,
    logName: 'hour-meters',
    event: 'deleted',
    description: `deleted hour meter ${existing.unitNo}`,
    subjectType: 'HourMeter',
    subjectId: idHm,
    properties: {
      unitNo: existing.unitNo,
      projectCode: existing.projectCode,
      hmUnit: Number(existing.hmUnit),
      dateHm: existing.dateHm
    }
  })

  return { success: true }
}

/** Cocokkan unit_no ke fleet_equipment_cache (scope project user). */
export async function resolveUnitFromCacheByUnitNo(session: Session, unitNo: string) {
  const normalized = unitNo.trim()
  if (!normalized) return null

  const equipment = await prisma.fleetUnitCache.findFirst({
    where: {
      unitNo: normalized,
      ...getPrismaProjectFilter(session)
    }
  })

  if (!equipment) return null
  if (!canAccessProject(session, equipment.projectCode)) return null

  return equipment
}

export async function resolveEquipmentByUnitNo(session: Session, unitNo: string) {
  const normalized = unitNo.trim()
  if (!normalized) return null

  const cached = await prisma.fleetUnitCache.findFirst({
    where: { unitNo: normalized }
  })

  if (cached) {
    if (!canAccessProject(session, cached.projectCode)) {
      return null
    }

    return cached
  }

  const { items } = await listUnitsForSession(session, { search: normalized })
  const match = items.find(item => item.unit_no.trim().toLowerCase() === normalized.toLowerCase())

  if (!match) return null

  return ensureUnitCache(match.id, session)
}

export const ensureEquipmentCache = ensureUnitCache

/** Latest HM reading for a unit (by id_hm desc). */
export async function getLatestHourMeterForUnit(fleetUnitId: number) {
  return prisma.hm.findFirst({
    where: { fleetUnitId, deletedAt: null },
    orderBy: [{ idHm: 'desc' }],
    select: { hmUnit: true, dateHm: true }
  })
}
