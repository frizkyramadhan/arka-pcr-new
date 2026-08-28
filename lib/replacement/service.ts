import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { calculateComponentLife } from '@/lib/calculations/life'
import { ensureEquipmentCache, getLatestHourMeterForUnit } from '@/lib/hour-meter/service'
import {
  canAddReplacementForComponent,
  getLatestReplacementForComponent,
  isMajorComponent
} from '@/lib/replacement/cycle'
import {
  attachLinkedForecast,
  assertReplacementBaApproved,
  replacementForecastInclude,
  type ReplacementLinkedForecast
} from '@/lib/replacement/forecast-link'
import { enrichReplacementsWithLiveMetrics } from '@/lib/replacement/life-metrics'
import { prisma } from '@/lib/prisma'
import type {
  ReplacementCloseInput,
  ReplacementCreateInput,
  ReplacementUpdateInput
} from '@/lib/validations/replacement'
import {
  canManageClosedReplacement,
  deleteClosedReplacement,
  recalculateComponentChain,
  reopenReplacement,
  assertCanEditClosedReplacement
} from '@/lib/replacement/reconcile'
import { attributeChanges, logActivity } from '@/lib/activity-log'
import { deleteStoredFile, saveReplacementReport } from '@/lib/utils/file-storage'
import { buildPlanPeriodMonthWhere } from '@/lib/forecasts/plan-period-filter'
import { appendSearchWhere, rowMatchesTextSearch } from '@/lib/utils/list-search'
import { canAccessProject, getPrismaProjectFilter, resolveProjectFilter } from '@/lib/utils/project-scope'

export { reopenReplacement, deleteClosedReplacement, canManageClosedReplacement, canEditClosedReplacement } from '@/lib/replacement/reconcile'

export type ReplacementListFilters = {
  fleetUnitId?: number | null
  idMod?: number | null
  woStatus?: string | null
  projectCode?: string | null
  repDate?: string | null
  search?: string | null
}

const replacementInclude = {
  commod: { include: { comp: true } },
  unit: true,
  forecast: { where: { deletedAt: null }, select: replacementForecastInclude }
} satisfies Prisma.ReplacementInclude

function buildListWhere(session: Session, filters: ReplacementListFilters): Prisma.ReplacementWhereInput {
  const where: Prisma.ReplacementWhereInput = {
    deletedAt: null,
    ...resolveProjectFilter(session, filters.projectCode)
  }

  if (filters.fleetUnitId) where.fleetUnitId = filters.fleetUnitId
  if (filters.idMod) where.idMod = filters.idMod
  if (filters.woStatus) where.woStatus = filters.woStatus

  if (filters.repDate) {
    const repDateWhere = buildPlanPeriodMonthWhere(filters.repDate)
    if (repDateWhere) where.repDate = repDateWhere
  }

  return appendSearchWhere(where, filters.search, [
    { unitNo: { contains: filters.search ?? '' } },
    { woNo: { contains: filters.search ?? '' } },
    { mrNo: { contains: filters.search ?? '' } },
    { prNo: { contains: filters.search ?? '' } },
    { poNo: { contains: filters.search ?? '' } },
    { projectCode: { contains: filters.search ?? '' } },
    { unit: { modelName: { contains: filters.search ?? '' } } },
    { commod: { comp: { compDesc: { contains: filters.search ?? '' } } } },
    { forecast: { baPcrs: { some: { isActive: true, noBaPcr: { contains: filters.search ?? '' } } } } }
  ])
}

async function syncForecastOnClose(replacementId: number, poNo: string | null | undefined) {
  const forecast = await prisma.pcrForecast.findUnique({ where: { idRep: replacementId } })
  if (!forecast || !poNo?.trim()) return

  await prisma.pcrForecast.update({
    where: { idForecast: forecast.idForecast },
    data: { forecastStatus: 'CLOSED' }
  })
}

export async function listReplacements(session: Session, filters: ReplacementListFilters = {}) {
  const rows = await prisma.replacement.findMany({
    where: buildListWhere(session, filters),
    include: replacementInclude,
    orderBy: [{ repDate: 'desc' }, { unitNo: 'asc' }, { idRep: 'desc' }]
  })

  return enrichReplacementsWithLiveMetrics(rows).then(enriched =>
    enriched.map(row => attachLinkedForecast(row))
  )
}

export type PaginatedResult<T> = {
  total: number
  rows: T[]
}

type ReplacementListQuery = {
  page: number
  pageSize: number
  sortField?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

function buildReplacementOrderBy(sortField?: string | null, sortOrder?: 'asc' | 'desc' | null): Prisma.ReplacementOrderByWithRelationInput[] {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'

  if (!sortField) return [{ repDate: 'desc' }, { unitNo: 'asc' }, { idRep: 'desc' }]

  switch (sortField) {
    case 'modelName':
      if (sortOrder === 'asc') {
        return [{ unit: { modelName: 'asc' } }, { repDate: 'desc' }, { unitNo: 'asc' }, { idRep: 'desc' }]
      }

      return [{ unit: { modelName: direction } }, { idRep: direction }]
    case 'unitNo':
      return [{ unitNo: direction }, { idRep: direction }]
    case 'projectCode':
      return [{ projectCode: direction }, { idRep: direction }]
    case 'woNo':
      return [{ woNo: direction }, { idRep: direction }]
    case 'repDate':
      return sortOrder === 'asc'
        ? [{ repDate: direction }, { unitNo: 'asc' }, { idRep: direction }]
        : [{ repDate: direction }, { unitNo: 'asc' }, { idRep: 'desc' }]
    case 'woStatus':
      return [{ woStatus: direction }, { idRep: direction }]
    case 'lifePercent':
      return [{ lifePercent: direction }, { idRep: direction }]
    case 'compHour':
      return [{ compHour: direction }, { idRep: direction }]
    case 'hmRep':
      return [{ hmRep: direction }, { idRep: direction }]
    case 'woDate':
      return [{ woDate: direction }, { idRep: direction }]
    case 'mrNo':
      return [{ mrNo: direction }, { idRep: direction }]
    case 'prNo':
      return [{ prNo: direction }, { idRep: direction }]
    case 'poNo':
      return [{ poNo: direction }, { idRep: direction }]
    case 'idRep':
      return [{ idRep: direction }]
    case 'compDesc':
      if (sortOrder === 'asc') {
        return [{ commod: { comp: { compDesc: 'asc' } } }, { repDate: 'desc' }, { idRep: 'desc' }]
      }

      return [{ commod: { comp: { compDesc: direction } } }, { idRep: direction }]
    case 'noBaPcr':
    case 'baPcrStatus':
      return [{ repDate: 'desc' }, { unitNo: 'asc' }, { idRep: 'desc' }]
    default:
      return [{ repDate: 'desc' }, { unitNo: 'asc' }, { idRep: 'desc' }]
  }
}

export async function listReplacementsPaginated(
  session: Session,
  filters: ReplacementListFilters = {},
  query: ReplacementListQuery
): Promise<PaginatedResult<Awaited<ReturnType<typeof enrichReplacementsWithLiveMetrics>> extends Array<infer R> ? R : never>> {
  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0

  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 10

  const where = buildListWhere(session, filters)
  const orderBy = buildReplacementOrderBy(query.sortField, query.sortOrder)

  const [total, rows] = await Promise.all([
    prisma.replacement.count({ where }),
    prisma.replacement.findMany({
      where,
      include: replacementInclude,
      orderBy,
      skip: page * pageSize,
      take: pageSize
    })
  ])

  const enriched = await enrichReplacementsWithLiveMetrics(rows)

  return { total, rows: enriched.map(row => attachLinkedForecast(row)) as any }
}

export async function getReplacementById(session: Session, idRep: number) {
  const row = await prisma.replacement.findFirst({
    where: {
      idRep,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: replacementInclude
  })

  if (!row) return null

  const [withMetrics] = await enrichReplacementsWithLiveMetrics([row])

  return attachLinkedForecast(withMetrics)
}

export async function createReplacement(session: Session, input: ReplacementCreateInput, createdBy?: number) {
  const equipment = await ensureEquipmentCache(input.fleetUnitId, session)

  const commod = await prisma.commod.findFirst({
    where: { idMod: input.idMod, fleetModelId: equipment.fleetModelId },
    include: { comp: true }
  })

  if (!commod) {
    throw new Error('Component policy not found for this equipment model')
  }

  const latest = await getLatestReplacementForComponent(input.fleetUnitId, input.idMod, getPrismaProjectFilter(session))

  if (!canAddReplacementForComponent(latest)) {
    throw new Error('Component already has an open work order. Edit or close it instead of adding a new one.')
  }

  const latestHm = await getLatestHourMeterForUnit(equipment.fleetUnitId)
  const hmRep = latestHm ? Number(latestHm.hmUnit) : input.hmRep

  const row = await prisma.replacement.create({
    data: {
      repDate: input.repDate,
      fleetUnitId: equipment.fleetUnitId,
      idMod: input.idMod,
      hmRep,
      hmRepManual: false,
      lastHmRep: input.lastHmRep,
      woNo: input.woNo ?? null,
      woDate: input.woDate ?? null,
      woEndDate: input.woEndDate ?? null,
      woStatus: 'OPEN',
      compHour: input.compHour ?? null,
      compCond: input.compCond,
      remarks: input.remarks,
      unitNo: equipment.unitNo,
      projectCode: equipment.projectCode,
      createdBy: createdBy ?? null
    },
    include: replacementInclude
  })

  logActivity({
    session,
    logName: 'replacements',
    event: 'created',
    description: `created replacement ${row.unitNo} — ${row.commod?.comp?.compDesc ?? 'component'}`,
    subjectType: 'Replacement',
    subjectId: row.idRep,
    properties: {
      unitNo: row.unitNo,
      projectCode: row.projectCode,
      woNo: row.woNo,
      woStatus: row.woStatus,
      idMod: row.idMod,
      compDesc: row.commod?.comp?.compDesc ?? null
    }
  })

  return row
}

export async function updateReplacement(session: Session, idRep: number, input: ReplacementUpdateInput) {
  const existing = await getReplacementById(session, idRep)
  if (!existing) return null

  if (existing.woStatus === 'CLOSE') {
    assertCanEditClosedReplacement(session)

    const poNo = input.poNo?.trim() || existing.poNo?.trim() || null

    const updated = await prisma.$transaction(async tx => {
      const row = await tx.replacement.update({
        where: { idRep },
        data: {
          repDate: input.repDate,
          hmRep: input.hmRep,
          hmRepManual: true,
          lastHmRep: input.lastHmRep,
          woNo: input.woNo,
          woDate: input.woDate,
          woEndDate: input.woEndDate,
          mrNo: input.mrNo,
          prNo: input.prNo,
          poNo: input.poNo,
          returnOldcoreDate: input.returnOldcoreDate,
          spbBaReturnOldcore: input.spbBaReturnOldcore,
          compHour: input.compHour,
          compCond: input.compCond,
          remarks: input.remarks,
          snapshotAt: new Date()
        },
        include: replacementInclude
      })

      await recalculateComponentChain(existing.fleetUnitId, existing.idMod, tx)

      return row
    })

    await syncForecastOnClose(idRep, poNo)

    const mapped = attachLinkedForecast(updated)
    logActivity({
      session,
      logName: 'replacements',
      event: 'updated',
      description: `updated closed replacement ${updated.unitNo} — ${updated.commod?.comp?.compDesc ?? 'component'}`,
      subjectType: 'Replacement',
      subjectId: idRep,
      properties: {
        unitNo: updated.unitNo,
        projectCode: updated.projectCode,
        woNo: updated.woNo,
        woStatus: updated.woStatus,
        idMod: updated.idMod,
        compDesc: updated.commod?.comp?.compDesc ?? null,
        closedEdit: true
      },
      attributeChanges: attributeChanges(
        {
          woNo: existing.woNo,
          hmRep: existing.hmRep,
          lastHmRep: existing.lastHmRep,
          mrNo: existing.mrNo,
          prNo: existing.prNo,
          poNo: existing.poNo,
          compCond: existing.compCond,
          remarks: existing.remarks
        },
        {
          woNo: updated.woNo,
          hmRep: updated.hmRep,
          lastHmRep: updated.lastHmRep,
          mrNo: updated.mrNo,
          prNo: updated.prNo,
          poNo: updated.poNo,
          compCond: updated.compCond,
          remarks: updated.remarks
        }
      )
    })

    return mapped
  }

  if (existing.woStatus !== 'OPEN') {
    throw new Error('Only OPEN work orders can be edited')
  }

  await assertReplacementBaApproved(idRep)

  let fleetUnitId = existing.fleetUnitId
  let unitNo = existing.unitNo
  let projectCode = existing.projectCode

  if (input.fleetUnitId && input.fleetUnitId !== existing.fleetUnitId) {
    const equipment = await ensureEquipmentCache(input.fleetUnitId, session)
    fleetUnitId = equipment.fleetUnitId
    unitNo = equipment.unitNo
    projectCode = equipment.projectCode
  }

  const updated = await prisma.replacement.update({
    where: { idRep },
    data: {
      fleetUnitId,
      idMod: input.idMod,
      repDate: input.repDate,
      hmRep: input.hmRep,
      hmRepManual: true,
      lastHmRep: input.lastHmRep,
      woNo: input.woNo,
      woDate: input.woDate,
      woEndDate: input.woEndDate,
      mrNo: input.mrNo,
      prNo: input.prNo,
      poNo: input.poNo,
      returnOldcoreDate: input.returnOldcoreDate,
      spbBaReturnOldcore: input.spbBaReturnOldcore,
      compHour: input.compHour,
      compCond: input.compCond,
      remarks: input.remarks,
      unitNo,
      projectCode,
      snapshotAt: new Date()
    },
    include: replacementInclude
  })

  logActivity({
    session,
    logName: 'replacements',
    event: 'updated',
    description: `updated replacement ${updated.unitNo} — ${updated.commod?.comp?.compDesc ?? 'component'}`,
    subjectType: 'Replacement',
    subjectId: idRep,
    properties: {
      unitNo: updated.unitNo,
      projectCode: updated.projectCode,
      woNo: updated.woNo,
      woStatus: updated.woStatus,
      idMod: updated.idMod,
      compDesc: updated.commod?.comp?.compDesc ?? null
    },
    attributeChanges: attributeChanges(
      {
        unitNo: existing.unitNo,
        idMod: existing.idMod,
        woNo: existing.woNo,
        hmRep: existing.hmRep,
        lastHmRep: existing.lastHmRep,
        mrNo: existing.mrNo,
        prNo: existing.prNo,
        poNo: existing.poNo,
        compCond: existing.compCond,
        remarks: existing.remarks
      },
      {
        unitNo: updated.unitNo,
        idMod: updated.idMod,
        woNo: updated.woNo,
        hmRep: updated.hmRep,
        lastHmRep: updated.lastHmRep,
        mrNo: updated.mrNo,
        prNo: updated.prNo,
        poNo: updated.poNo,
        compCond: updated.compCond,
        remarks: updated.remarks
      }
    )
  })

  return attachLinkedForecast(updated)
}

export async function deleteReplacement(session: Session, idRep: number) {
  const existing = await getReplacementById(session, idRep)
  if (!existing) return null

  if (existing.woStatus === 'CLOSE') {
    const result = await deleteClosedReplacement(session, idRep)
    if (result) {
      logActivity({
        session,
        logName: 'replacements',
        event: 'deleted',
        description: `deleted closed replacement ${existing.unitNo}`,
        subjectType: 'Replacement',
        subjectId: idRep,
        properties: {
          unitNo: existing.unitNo,
          projectCode: existing.projectCode,
          woNo: existing.woNo,
          woStatus: existing.woStatus,
          idMod: existing.idMod
        }
      })
    }

    return result
  }

  if (existing.woStatus !== 'OPEN') {
    throw new Error('Only OPEN work orders can be deleted')
  }

  await assertReplacementBaApproved(idRep)

  if (existing.report) {
    deleteStoredFile(existing.report)
  }

  await prisma.$transaction(async tx => {
    await tx.replacement.update({
      where: { idRep },
      data: { deletedAt: new Date(), report: null }
    })

    await recalculateComponentChain(existing.fleetUnitId, existing.idMod, tx)
  })

  logActivity({
    session,
    logName: 'replacements',
    event: 'deleted',
    description: `deleted replacement ${existing.unitNo}`,
    subjectType: 'Replacement',
    subjectId: idRep,
    properties: {
      unitNo: existing.unitNo,
      projectCode: existing.projectCode,
      woNo: existing.woNo,
      woStatus: existing.woStatus,
      idMod: existing.idMod
    }
  })

  return { success: true }
}

export async function closeReplacement(session: Session, idRep: number, input: ReplacementCloseInput) {
  const existing = await getReplacementById(session, idRep)
  if (!existing) return null

  if (existing.woStatus !== 'OPEN') {
    throw new Error('Work order is already closed')
  }

  await assertReplacementBaApproved(idRep)

  const linkedForecast = await prisma.pcrForecast.findUnique({ where: { idRep } })

  const mrNo = input.mrNo?.trim() || existing.mrNo?.trim() || null
  const prNo = input.prNo?.trim() || existing.prNo?.trim() || null
  const poNo = input.poNo?.trim() || existing.poNo?.trim() || null
  const returnOldcoreDate = input.returnOldcoreDate ?? existing.returnOldcoreDate ?? null

  const spbBaReturnOldcore =
    input.spbBaReturnOldcore?.trim() || existing.spbBaReturnOldcore?.trim() || null

  const missingProcurement: string[] = []
  if (!mrNo) missingProcurement.push('MR No')
  if (!prNo) missingProcurement.push('PR No')
  if (!poNo) missingProcurement.push('PO No')
  if (!returnOldcoreDate) missingProcurement.push('Return Oldcore Date')
  if (!spbBaReturnOldcore) missingProcurement.push('SPB/BA Return Oldcore')

  if (missingProcurement.length > 0) {
    throw new Error(`Complete procurement & oldcore before closing: ${missingProcurement.join(', ')}`)
  }

  if (linkedForecast && !poNo) {
    throw new Error('PO number is required to close work order linked to a PCR forecast')
  }

  const commod = await prisma.commod.findUnique({
    where: { idMod: existing.idMod },
    include: { comp: true }
  })
  if (!commod) throw new Error('Component policy not found')

  const compType = commod.comp?.compType ?? commod.lifeType
  if (isMajorComponent(compType) && !existing.report) {
    throw new Error('Please upload installation report first')
  }

  const equipment = await ensureEquipmentCache(existing.fleetUnitId, session)
  const closingHm = input.closingHm
  const lastHmRep = Number(existing.lastHmRep ?? 0)
  const closedHmRep = Number(existing.hmRep)
  const compHour = existing.compHour ?? 0

  const latestHm = await getLatestHourMeterForUnit(existing.fleetUnitId)
  const latestHmUnit = latestHm ? Number(latestHm.hmUnit) : null

  if (latestHmUnit != null && closingHm > latestHmUnit) {
    throw new Error(
      `Closing HM (${closingHm}) exceeds latest unit HM (${latestHmUnit}). Use HM at replacement date, not current reading.`
    )
  }

  const calc = calculateComponentLife({
    hmNow: closingHm,
    hmLastReplacement: lastHmRep,
    compHour,
    policy: commod.policy ?? 1
  })

  const lifePercent = Math.round(calc.lifePercent * 10) / 10
  const woEndDate = input.woEndDate ?? new Date()
  const createdBy = Number(session.user?.id) || undefined
  const spawnHmRep = latestHmUnit ?? closingHm

  const closed = await prisma.$transaction(async tx => {
    const updated = await tx.replacement.update({
      where: { idRep },
      data: {
        hmRep: closingHm,
        lastHmRep,
        woStatus: 'CLOSE',
        woEndDate,
        compLife: calc.currentLife,
        lifePercent,
        lifeCalculatedAt: new Date(),
        mrNo,
        prNo,
        poNo,
        returnOldcoreDate,
        spbBaReturnOldcore
      },
      include: replacementInclude
    })

    await tx.replacement.create({
      data: {
        repDate: new Date(),
        lastRepDate: woEndDate,
        fleetUnitId: existing.fleetUnitId,
        idMod: existing.idMod,
        hmRep: spawnHmRep,
        hmRepManual: false,
        lastHmRep: closedHmRep,
        woStatus: 'OPEN',
        compHour: 0,
        compCond: 'A',
        remarks: '',
        unitNo: equipment.unitNo,
        projectCode: equipment.projectCode,
        createdBy: createdBy ?? null
      }
    })

    return updated
  })

  await syncForecastOnClose(idRep, poNo)

  logActivity({
    session,
    logName: 'replacements',
    event: 'updated',
    description: `closed replacement ${closed.unitNo} — ${closed.commod?.comp?.compDesc ?? 'component'}`,
    subjectType: 'Replacement',
    subjectId: idRep,
    properties: {
      unitNo: closed.unitNo,
      projectCode: closed.projectCode,
      woNo: closed.woNo,
      woStatus: closed.woStatus,
      closingHm,
      poNo,
      idMod: closed.idMod,
      compDesc: closed.commod?.comp?.compDesc ?? null
    }
  })

  return closed
}

export async function uploadReplacementReport(session: Session, idRep: number, file: File) {
  const existing = await getReplacementById(session, idRep)
  if (!existing) return null

  await assertReplacementBaApproved(idRep)

  if (existing.report) {
    deleteStoredFile(existing.report)
  }

  const relativePath = await saveReplacementReport(idRep, file)

  const updated = await prisma.replacement.update({
    where: { idRep },
    data: { report: relativePath },
    include: replacementInclude
  })

  logActivity({
    session,
    logName: 'replacements',
    event: 'updated',
    description: `uploaded replacement report ${updated.unitNo}`,
    subjectType: 'Replacement',
    subjectId: idRep,
    properties: {
      unitNo: updated.unitNo,
      projectCode: updated.projectCode,
      woNo: updated.woNo,
      report: relativePath
    }
  })

  return updated
}

export async function deleteReplacementReport(session: Session, idRep: number) {
  const existing = await getReplacementById(session, idRep)
  if (!existing) return null

  if (existing.report) {
    deleteStoredFile(existing.report)
  }

  const updated = await prisma.replacement.update({
    where: { idRep },
    data: { report: null },
    include: replacementInclude
  })

  logActivity({
    session,
    logName: 'replacements',
    event: 'updated',
    description: `deleted replacement report ${updated.unitNo}`,
    subjectType: 'Replacement',
    subjectId: idRep,
    properties: {
      unitNo: updated.unitNo,
      projectCode: updated.projectCode,
      woNo: updated.woNo,
      report: null
    }
  })

  return updated
}

export type ComponentLatestReplacementRow = {
  idMod: number
  compDesc: string
  compType: string | null
  policy: number | null
  price: Prisma.Decimal | null
  lifePercent: number | null
  sosRating: string | null
  ratingCbm: string | null
  canAddReplacement: boolean
  forecastQuarter: string | null
  linkedForecast: ReplacementLinkedForecast | null
  latestReplacement: Awaited<ReturnType<typeof enrichReplacementsWithLiveMetrics>>[number] | null
}

type ComponentLatestQuery = {
  page: number
  pageSize: number
  search?: string | null
}

function matchesComponentLatestSearch(
  row: ComponentLatestReplacementRow,
  search: string | null | undefined
): boolean {
  const linked = row.linkedForecast
  const latest = row.latestReplacement

  return rowMatchesTextSearch(
    [
      row.compDesc,
      row.compType,
      row.policy,
      row.price,
      row.lifePercent,
      row.sosRating,
      row.ratingCbm,
      row.forecastQuarter,
      linked?.noBaPcr,
      linked?.baPcrStatus,
      linked?.forecastStatus,
      latest?.woNo,
      latest?.woStatus,
      latest?.mrNo,
      latest?.prNo,
      latest?.poNo,
      latest?.compCond
    ],
    search
  )
}

/** One row per model component — latest replacement (max id_rep) for the unit. */
export async function listLatestReplacementsByComponentPaginated(
  session: Session,
  fleetUnitId: number,
  query: ComponentLatestQuery
): Promise<PaginatedResult<ComponentLatestReplacementRow>> {
  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0

  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 10

  const equipment = await prisma.fleetUnitCache.findUnique({
    where: { fleetUnitId }
  })

  if (!equipment) {
    throw new Error('Unit not found in local cache')
  }

  if (!canAccessProject(session, equipment.projectCode)) {
    return { total: 0, rows: [] }
  }

  const projectFilter = getPrismaProjectFilter(session)

  const [commods, replacements, conditions, sosRows, openForecasts] = await Promise.all([
    prisma.commod.findMany({
      where: { fleetModelId: equipment.fleetModelId },
      include: { comp: true },
      orderBy: { comp: { compDesc: 'asc' } }
    }),
    prisma.replacement.findMany({
      where: {
        fleetUnitId,
        deletedAt: null,
        ...projectFilter
      },
      include: replacementInclude,
      orderBy: { idRep: 'desc' }
    }),
    prisma.condition.findMany({
      where: { fleetUnitId, deletedAt: null }
    }),
    prisma.sos.findMany({
      where: { fleetUnitId, deletedAt: null },
      orderBy: [{ sampleDate: 'desc' }, { idSos: 'desc' }]
    }),
    prisma.pcrForecast.findMany({
      where: {
        fleetUnitId,
        forecastStatus: 'OPEN',
        deletedAt: null,
        ...projectFilter
      },
      select: { idMod: true, quarter: true }
    })
  ])

  const conditionByMod = new Map(conditions.map(row => [row.idMod, row]))
  const forecastQuarterByMod = new Map(openForecasts.map(row => [row.idMod, row.quarter]))
  const latestSosByMod = new Map<number, string | null>()
  for (const row of sosRows) {
    if (!latestSosByMod.has(row.idMod)) {
      latestSosByMod.set(row.idMod, row.evalCode?.slice(0, 1) ?? null)
    }
  }

  const latestByMod = new Map<number, (typeof replacements)[number]>()
  for (const rep of replacements) {
    if (!latestByMod.has(rep.idMod)) {
      latestByMod.set(rep.idMod, rep)
    }
  }

  const enrichedLatest = await enrichReplacementsWithLiveMetrics([...latestByMod.values()])
  const enrichedByMod = new Map(enrichedLatest.map(row => [row.idMod, row]))

  const allRows: ComponentLatestReplacementRow[] = commods.map(commod => {
    const latestRaw = enrichedByMod.get(commod.idMod) ?? null
    const latest = latestRaw ? attachLinkedForecast(latestRaw) : null
    let lifePercent: number | null = null

    if (latest) {
      lifePercent =
        latest.woStatus === 'CLOSE'
          ? Number(latest.lifePercent)
          : (latest.liveMetrics?.lifePercent ?? null)
    }

    const conditionRow = conditionByMod.get(commod.idMod)

    return {
      idMod: commod.idMod,
      compDesc: commod.comp.compDesc,
      compType: commod.comp.compType ?? commod.lifeType ?? null,
      policy: commod.policy,
      price: commod.price,
      lifePercent,
      sosRating: conditionRow?.sosRating ?? latestSosByMod.get(commod.idMod) ?? null,
      ratingCbm: conditionRow?.condition ?? null,
      canAddReplacement: canAddReplacementForComponent(latestRaw),
      forecastQuarter: forecastQuarterByMod.get(commod.idMod) ?? null,
      linkedForecast: latest?.linkedForecast ?? null,
      latestReplacement: latest
    }
  })

  const filteredRows = query.search
    ? allRows.filter(row => matchesComponentLatestSearch(row, query.search))
    : allRows

  const total = filteredRows.length
  const rows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  return { total, rows }
}
