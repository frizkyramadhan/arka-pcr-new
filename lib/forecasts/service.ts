import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { deriveQuarter, isCriticalSosRating } from '@/lib/calculations/life'
import {
  canApproveAtLevel,
  canRejectAtLevel,
  canRevokeApproval,
  getCurrentPendingPcrLevel,
  getPendingLevelsForSession,
  isFullyApproved,
  resolveApprovalStageStatusFilter,
  syncStatusBaPcr
} from '@/lib/forecasts/approval-workflow'
import {
  notifyApprovalDecisionAsync,
  notifyApprovalPendingAsync,
  notifyFullyApprovedAsync
} from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import { attributeChanges } from '@/lib/activity-log/diff'
import { getPcrForecastApprovalSeedRows } from '@/lib/approval/registry'
import {
  appendRejectionHistory,
  formatRejectorName
} from '@/lib/forecasts/ba-pcr-rejection-history'
import {
  activeBaPcrSomeFilter,
  canDeleteForecast,
  canRefreshBaPcr,
  canSubmitBaPcr,
  flattenForecastBaFields,
  flattenForecastForBaPcr,
  forecastWithoutBaPcrFilter,
  pickActiveBaPcr,
  resolveBaPcrStatus
} from '@/lib/forecasts/ba-pcr-helpers'
import {
  assertBaPcrSequenceAvailable,
  formatBaPcrNumber,
  isCbmCriticalForForecast,
  maxBaPcrSequenceForSiteYear,
  nextBaPcrSequence,
  parseBaPcrSequence,
  romanMonthFromDate
} from '@/lib/forecasts/ba-pcr-number'
import { canUserConvertForecast } from '@/lib/forecasts/convert-auth'
import { buildForecastSnapshot } from '@/lib/forecasts/build-snapshot'
import { resolveLinkableIdRep } from '@/lib/forecasts/id-rep-link'
import { buildPlanPeriodMonthWhere } from '@/lib/forecasts/plan-period-filter'
import { ensureEquipmentCache, getLatestHourMeterForUnit } from '@/lib/hour-meter/service'
import { prisma } from '@/lib/prisma'
import type {
  ForecastCloseInput,
  ForecastCreateInput,
  ForecastGenerateInput,
  ForecastSubmitBaInput,
  ForecastUpdateInput
} from '@/lib/validations/forecast'
import {
  getPrismaProjectFilter,
  getSessionProjectCodes,
  canAccessProject,
  hasAllProjectsAccess,
  isHeadOffice,
  resolveProjectFilter
} from '@/lib/utils/project-scope'
import { getForecastApprovalLevels, hasPermission } from '@/lib/utils/api-auth'
import { appendSearchWhere } from '@/lib/utils/list-search'
import { toIsoDateOnly } from '@/lib/utils/date-only'

export type ForecastListFilters = {
  projectCode?: string | null
  quarter?: string | null
  planPeriod?: string | null
  status?: string | null
  baPcrStatus?: string | null
  fleetUnitId?: number | null
  idMod?: number | null
  search?: string | null
}

const baPcrInclude = {
  submitter: { select: { idUser: true, fullName: true, username: true } },
  approvals: {
    orderBy: { stepOrder: 'asc' as const },
    include: {
      approver: { select: { idUser: true, fullName: true, username: true } }
    }
  }
} satisfies Prisma.BaPcrInclude

const forecastInclude = {
  commod: { include: { comp: true } },
  unit: true,
  replacement: {
    select: {
      idRep: true,
      woNo: true,
      woStatus: true,
      woDate: true,
      woEndDate: true,
      mrNo: true,
      prNo: true,
      poNo: true,
      returnOldcoreDate: true,
      spbBaReturnOldcore: true
    }
  },
  baPcrs: {
    where: { isActive: true },
    include: baPcrInclude,
    take: 1
  }
} satisfies Prisma.PcrForecastInclude

const forecastDetailInclude = {
  commod: { include: { comp: true } },
  unit: true,
  creator: { select: { idUser: true, fullName: true, username: true } },
  replacement: {
    select: {
      idRep: true,
      woNo: true,
      woStatus: true,
      woDate: true,
      woEndDate: true,
      mrNo: true,
      prNo: true,
      poNo: true,
      returnOldcoreDate: true,
      spbBaReturnOldcore: true
    }
  },
  baPcrs: {
    orderBy: { createdAt: 'desc' as const },
    include: baPcrInclude
  }
} satisfies Prisma.PcrForecastInclude

const forecastApprovalDetailInclude = {
  commod: { include: { comp: true } },
  unit: true,
  creator: { select: { idUser: true, fullName: true, username: true } },
  replacement: forecastDetailInclude.replacement
} satisfies Prisma.PcrForecastInclude

function mapForecastRow<T extends Prisma.PcrForecastGetPayload<{ include: typeof forecastInclude }>>(row: T) {
  return flattenForecastBaFields(row)
}

function buildBaPcrStatusWhere(baPcrStatus?: string | null): Prisma.PcrForecastWhereInput | undefined {
  if (!baPcrStatus) return undefined

  if (baPcrStatus === 'PENDING') {
    return {
      OR: [
        forecastWithoutBaPcrFilter(),
        { baPcrs: { none: { isActive: true } } },
        activeBaPcrSomeFilter('PENDING')
      ]
    }
  }

  return activeBaPcrSomeFilter(baPcrStatus)
}

function buildListWhere(session: Session, filters: ForecastListFilters): Prisma.PcrForecastWhereInput {
  const where: Prisma.PcrForecastWhereInput = {
    deletedAt: null,
    ...resolveProjectFilter(session, filters.projectCode)
  }

  if (filters.quarter) where.quarter = filters.quarter
  if (filters.status) where.forecastStatus = filters.status
  if (filters.fleetUnitId) where.fleetUnitId = filters.fleetUnitId
  if (filters.idMod) where.idMod = filters.idMod

  if (filters.planPeriod) {
    const planPeriodWhere = buildPlanPeriodMonthWhere(filters.planPeriod)
    if (planPeriodWhere) where.planPeriod = planPeriodWhere
  }

  const baWhere = buildBaPcrStatusWhere(filters.baPcrStatus)
  if (baWhere) Object.assign(where, baWhere)

  return appendSearchWhere(where, filters.search, [
    { unitNo: { contains: filters.search ?? '' } },
    { compDesc: { contains: filters.search ?? '' } },
    { modelName: { contains: filters.search ?? '' } },
    { projectCode: { contains: filters.search ?? '' } },
    { quarter: { contains: filters.search ?? '' } },
    { commod: { comp: { compDesc: { contains: filters.search ?? '' } } } },
    { baPcrs: { some: { isActive: true, noBaPcr: { contains: filters.search ?? '' } } } }
  ])
}

function resolvePriceComponent(
  inputPrice: number | null | undefined,
  snapshotPrice: number | null
): number | null {
  if (typeof inputPrice === 'number' && Number.isFinite(inputPrice)) {
    return inputPrice
  }

  return snapshotPrice ?? null
}

async function assertNoOpenForecast(fleetUnitId: number, idMod: number, excludeId?: number) {
  const existing = await prisma.pcrForecast.findFirst({
    where: {
      fleetUnitId,
      idMod,
      forecastStatus: 'OPEN',
      deletedAt: null,
      ...(excludeId ? { NOT: { idForecast: excludeId } } : {})
    }
  })

  if (existing) {
    throw new Error('An OPEN forecast already exists for this equipment and component')
  }
}

export async function listForecasts(session: Session, filters: ForecastListFilters = {}) {
  const rows = await prisma.pcrForecast.findMany({
    where: buildListWhere(session, filters),
    include: forecastInclude,
    orderBy: [{ planPeriod: 'desc' }, { idForecast: 'desc' }]
  })

  return rows.map(mapForecastRow)
}

export type PaginatedResult<T> = {
  total: number
  rows: T[]
}

type ForecastListQuery = {
  page: number
  pageSize: number
  sortField?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

function buildForecastOrderBy(sortField?: string | null, sortOrder?: 'asc' | 'desc' | null): Prisma.PcrForecastOrderByWithRelationInput[] {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'

  if (!sortField) return [{ planPeriod: 'desc' }, { idForecast: 'desc' }]

  switch (sortField) {
    case 'unitNo':
      return [{ unitNo: direction }, { idForecast: direction }]
    case 'modelName':
      return [{ modelName: direction }, { idForecast: direction }]
    case 'compDesc':
      if (sortOrder === 'asc') {
        return [{ compDesc: 'asc' }, { planPeriod: 'desc' }, { idForecast: 'desc' }]
      }

      return [{ compDesc: direction }, { idForecast: direction }]
    case 'quarter':
      return [{ quarter: direction }, { idForecast: direction }]
    case 'lifePercent':
      return [{ lifePercent: direction }, { idForecast: direction }]
    case 'ratingSos':
      return [{ ratingSos: direction }, { idForecast: direction }]
    case 'projectCode':
      return [{ projectCode: direction }, { idForecast: direction }]
    case 'status':
    case 'forecastStatus':
      return [{ forecastStatus: direction }, { idForecast: direction }]
    case 'baPcrStatus':
    case 'statusBaPcr':
    case 'baSubmittedAt':
      return [{ planPeriod: direction }, { idForecast: direction }]
    case 'planPeriod':
      return [{ planPeriod: direction }, { idForecast: direction }]
    case 'priceComponent':
      return [{ priceComponent: direction }, { idForecast: direction }]
    case 'ratingCbm':
      return [{ ratingCbm: direction }, { idForecast: direction }]
    case 'hmComponent':
      return [{ hmComponent: direction }, { idForecast: direction }]
    case 'policy':
      return [{ policy: direction }, { idForecast: direction }]
    case 'noBaPcr':
      return [{ planPeriod: direction }, { idForecast: direction }]
    default:
      return [{ planPeriod: 'desc' }, { idForecast: 'desc' }]
  }
}

export async function listForecastsPaginated(
  session: Session,
  filters: ForecastListFilters = {},
  query: ForecastListQuery
): Promise<PaginatedResult<ReturnType<typeof mapForecastRow>>> {
  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0

  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 10

  const where = buildListWhere(session, filters)

  const [total, rows] = await Promise.all([
    prisma.pcrForecast.count({ where }),
    prisma.pcrForecast.findMany({
      where,
      include: forecastInclude,
      orderBy: buildForecastOrderBy(query.sortField, query.sortOrder),
      skip: page * pageSize,
      take: pageSize
    })
  ])

  return { total, rows: rows.map(mapForecastRow) }
}

export async function getForecastById(session: Session, idForecast: number) {
  const forecast = await prisma.pcrForecast.findFirst({
    where: {
      idForecast,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: forecastDetailInclude
  })

  if (!forecast) return null

  const latestHm = await getLatestHourMeterForUnit(forecast.fleetUnitId)

  return {
    ...flattenForecastBaFields(forecast),
    latestUnitHm: latestHm ? Number(latestHm.hmUnit) : null,
    latestUnitHmDate: latestHm?.dateHm ?? null
  }
}

/** Approval review — forecast context scoped to one ba_pcr row (no multi-BA history). */
export async function getForecastApprovalByBaPcr(session: Session, idBaPcr: number) {
  const baPcr = await prisma.baPcr.findFirst({
    where: {
      idBaPcr,
      forecast: {
        deletedAt: null,
        ...getPrismaProjectFilter(session)
      }
    },
    include: {
      ...baPcrInclude,
      forecast: { include: forecastApprovalDetailInclude }
    }
  })

  if (!baPcr?.forecast) return null

  const latestHm = await getLatestHourMeterForUnit(baPcr.forecast.fleetUnitId)

  return {
    ...flattenForecastForBaPcr(baPcr.forecast, baPcr),
    latestUnitHm: latestHm ? Number(latestHm.hmUnit) : null,
    latestUnitHmDate: latestHm?.dateHm ?? null
  }
}

export async function createForecast(session: Session, input: ForecastCreateInput, createdBy?: number) {
  await ensureEquipmentCache(input.fleetUnitId, session)

  const commod = await prisma.commod.findUnique({ where: { idMod: input.idMod } })
  if (!commod) throw new Error('Model-component policy not found')

  await assertNoOpenForecast(input.fleetUnitId, input.idMod)

  const snapshot = await buildForecastSnapshot(input.fleetUnitId, input.idMod)
  const planPeriod = input.planPeriod
  const quarter = input.quarter ?? deriveQuarter(planPeriod)

  let linkedIdRep = await resolveLinkableIdRep(snapshot.baselineIdRep)

  if (input.idRep != null) {
    const rep = await prisma.replacement.findFirst({
      where: {
        idRep: input.idRep,
        fleetUnitId: input.fleetUnitId,
        idMod: input.idMod,
        woStatus: 'OPEN',
        deletedAt: null,
        ...getPrismaProjectFilter(session)
      }
    })

    if (!rep) {
      throw new Error('Open work order not found for this unit and component')
    }

    const reclaimable = await resolveLinkableIdRep(input.idRep)
    if (reclaimable == null) {
      throw new Error('This work order is already linked to a forecast')
    }

    linkedIdRep = rep.idRep
  }

  const row = await prisma.pcrForecast.create({
    data: {
      fleetUnitId: input.fleetUnitId,
      idMod: input.idMod,
      modelName: snapshot.modelName,
      unitNo: snapshot.unitNo,
      projectCode: snapshot.projectCode,
      compDesc: snapshot.compDesc,
      hmComponent: snapshot.hmComponent,
      policy: snapshot.policy,
      lifePercent: snapshot.lifePercent,
      ratingSos: snapshot.ratingSos,
      ratingCbm: snapshot.ratingCbm,
      priceComponent: resolvePriceComponent(input.priceComponent, snapshot.priceComponent),
      snapshotAt: snapshot.snapshotAt,
      planPeriod,
      quarter,
      remark: input.remark ?? null,
      idRep: linkedIdRep,
      createdBy: createdBy ?? null,
      source: 'MANUAL'
    },
    include: forecastInclude
  })

  const mapped = mapForecastRow(row)
  logActivity({
    session,
    logName: 'forecasts',
    event: 'created',
    description: `created forecast ${mapped.unitNo} — ${mapped.compDesc ?? 'component'}`,
    subjectType: 'PcrForecast',
    subjectId: mapped.idForecast,
    properties: {
      unitNo: mapped.unitNo,
      projectCode: mapped.projectCode,
      compDesc: mapped.compDesc
    }
  })

  return mapped
}

export async function updateForecast(session: Session, idForecast: number, input: ForecastUpdateInput) {
  const existing = await getForecastById(session, idForecast)
  if (!existing) return null

  if (existing.forecastStatus !== 'OPEN') {
    throw new Error('Only OPEN forecasts can be edited')
  }

  const planPeriod = input.planPeriod ?? existing.planPeriod
  const quarter = input.quarter ?? (input.planPeriod ? deriveQuarter(planPeriod) : existing.quarter)

  const row = await prisma.pcrForecast.update({
    where: { idForecast },
    data: {
      planPeriod,
      quarter,
      remark: input.remark !== undefined ? input.remark : existing.remark,
      ...(input.priceComponent !== undefined ? { priceComponent: input.priceComponent } : {})
    },
    include: forecastInclude
  })

  const mapped = mapForecastRow(row)
  logActivity({
    session,
    logName: 'forecasts',
    event: 'updated',
    description: `updated forecast ${mapped.unitNo} — ${mapped.compDesc ?? 'component'}`,
    subjectType: 'PcrForecast',
    subjectId: mapped.idForecast,
    properties: { unitNo: mapped.unitNo, projectCode: mapped.projectCode },
    attributeChanges: attributeChanges(
      {
        planPeriod: existing.planPeriod,
        quarter: existing.quarter,
        remark: existing.remark,
        priceComponent: existing.priceComponent
      },
      {
        planPeriod: mapped.planPeriod,
        quarter: mapped.quarter,
        remark: mapped.remark,
        priceComponent: mapped.priceComponent
      }
    )
  })

  return mapped
}

export async function deleteForecast(session: Session, idForecast: number) {
  const existing = await prisma.pcrForecast.findFirst({
    where: { idForecast, deletedAt: null, ...getPrismaProjectFilter(session) },
    include: { baPcrs: { where: { isActive: true }, take: 1 } }
  })

  if (!existing) return null

  if (!canDeleteForecast(existing, pickActiveBaPcr(existing.baPcrs))) {
    throw new Error('Cannot delete forecast that is submitted or closed')
  }

  await prisma.pcrForecast.update({
    where: { idForecast },
    data: {
      deletedAt: new Date(),

      // Putuskan tautan WO agar kolom PCR Forecast di replacement tidak menampilkan forecast terhapus.
      idRep: null
    }
  })

  logActivity({
    session,
    logName: 'forecasts',
    event: 'deleted',
    description: `deleted forecast ${existing.unitNo} — ${existing.compDesc ?? 'component'}`,
    subjectType: 'PcrForecast',
    subjectId: idForecast,
    properties: { unitNo: existing.unitNo, projectCode: existing.projectCode }
  })

  return { success: true }
}

export async function deleteAllForecastsForUnit(session: Session, fleetUnitId: number) {
  const equipment = await prisma.fleetUnitCache.findUnique({ where: { fleetUnitId } })

  if (!equipment || !canAccessProject(session, equipment.projectCode)) {
    throw new Error('Unit not found or access denied')
  }

  const rows = await prisma.pcrForecast.findMany({
    where: {
      fleetUnitId,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: { baPcrs: { where: { isActive: true }, take: 1 } }
  })

  let deleted = 0
  let skipped = 0

  for (const row of rows) {
    if (!canDeleteForecast(row, pickActiveBaPcr(row.baPcrs))) {
      skipped += 1
      continue
    }

    await prisma.pcrForecast.update({
      where: { idForecast: row.idForecast },
      data: { deletedAt: new Date(), idRep: null }
    })
    deleted += 1
  }

  return { deleted, skipped }
}

/** Debug purge — dinonaktifkan (tidak dipakai). Aktifkan kembali bila perlu reset data dev.
export async function purgeAllForecastsDebug() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Debug purge is only available in development')
  }

  return prisma.$transaction(async tx => {
    const deletedApprovals = await tx.pcrForecastApproval.deleteMany()
    const deletedBa = await tx.baPcr.deleteMany()
    const deletedForecasts = await tx.pcrForecast.deleteMany()

    await tx.$executeRawUnsafe('ALTER TABLE pcr_forecast AUTO_INCREMENT = 1')
    await tx.$executeRawUnsafe('ALTER TABLE ba_pcr AUTO_INCREMENT = 1')
    await tx.$executeRawUnsafe('ALTER TABLE pcr_forecast_approval AUTO_INCREMENT = 1')

    return {
      deletedForecasts: deletedForecasts.count,
      deletedBa: deletedBa.count,
      deletedApprovals: deletedApprovals.count
    }
  })
}
*/

export async function refreshForecastMetrics(session: Session, idForecast: number) {
  const existing = await prisma.pcrForecast.findFirst({
    where: { idForecast, deletedAt: null, ...getPrismaProjectFilter(session) },
    include: { baPcrs: { where: { isActive: true }, take: 1 } }
  })

  if (!existing) return null

  if (!canRefreshBaPcr(pickActiveBaPcr(existing.baPcrs))) {
    throw new Error('Snapshot refresh only allowed when BA PCR is PENDING or REJECTED')
  }

  const snapshot = await buildForecastSnapshot(existing.fleetUnitId, existing.idMod)
  const linkedIdRep = await resolveLinkableIdRep(snapshot.baselineIdRep, idForecast)

  const row = await prisma.pcrForecast.update({
    where: { idForecast },
    data: {
      modelName: snapshot.modelName,
      unitNo: snapshot.unitNo,
      projectCode: snapshot.projectCode,
      compDesc: snapshot.compDesc,
      hmComponent: snapshot.hmComponent,
      policy: snapshot.policy,
      lifePercent: snapshot.lifePercent,
      ratingSos: snapshot.ratingSos,
      ratingCbm: snapshot.ratingCbm,
      priceComponent: snapshot.priceComponent,
      snapshotAt: snapshot.snapshotAt,
      idRep: linkedIdRep
    },
    include: forecastInclude
  })

  return mapForecastRow(row)
}

export async function bulkRefreshForecasts(
  session: Session,
  filters: { projectCode?: string | null; quarter?: string | null }
) {
  const rows = await listForecasts(session, {
    ...filters,
    status: 'OPEN',
    baPcrStatus: 'PENDING'
  })

  let refreshed = 0
  for (const row of rows) {
    await refreshForecastMetrics(session, row.idForecast)
    refreshed += 1
  }

  return { refreshed }
}

export async function generateForecasts(session: Session, input: ForecastGenerateInput, createdBy?: number) {
  const planPeriod = input.planPeriod ?? new Date()
  const quarter = input.quarter ?? deriveQuarter(planPeriod)

  let equipments: Awaited<ReturnType<typeof prisma.fleetUnitCache.findMany>>

  if (input.fleetUnitId) {
    const equipment = await prisma.fleetUnitCache.findUnique({
      where: { fleetUnitId: input.fleetUnitId }
    })

    if (!equipment || !canAccessProject(session, equipment.projectCode)) {
      return { created: 0, skipped: 0 }
    }

    equipments = [equipment]
  } else {
    const equipmentWhere: Prisma.FleetUnitCacheWhereInput = {}
    const scopeCodes = getSessionProjectCodes(session)

    if (hasAllProjectsAccess(session)) {
      if (input.projectCode) equipmentWhere.projectCode = input.projectCode
    } else if (scopeCodes.length === 1) {
      equipmentWhere.projectCode = scopeCodes[0]
    } else if (scopeCodes.length > 1) {
      equipmentWhere.projectCode = { in: scopeCodes }
    }

    equipments = await prisma.fleetUnitCache.findMany({ where: equipmentWhere })
  }

  let created = 0
  let skipped = 0

  for (const equipment of equipments) {
    const commods = await prisma.commod.findMany({ where: { fleetModelId: equipment.fleetModelId } })

    for (const commod of commods) {
      const openExists = await prisma.pcrForecast.findFirst({
        where: {
          fleetUnitId: equipment.fleetUnitId,
          idMod: commod.idMod,
          forecastStatus: 'OPEN',
          deletedAt: null
        }
      })

      if (openExists) {
        skipped += 1
        continue
      }

      const snapshot = await buildForecastSnapshot(equipment.fleetUnitId, commod.idMod)

      const condition = await prisma.condition.findFirst({
        where: { fleetUnitId: equipment.fleetUnitId, idMod: commod.idMod, deletedAt: null }
      })

      const shouldGenerate =
        snapshot.lifePercent >= input.lifeThreshold ||
        isCriticalSosRating(snapshot.ratingSos) ||
        isCbmCriticalForForecast(condition)

      if (!shouldGenerate) {
        skipped += 1
        continue
      }

      const linkedIdRep = await resolveLinkableIdRep(snapshot.baselineIdRep)

      await prisma.pcrForecast.create({
        data: {
          fleetUnitId: equipment.fleetUnitId,
          idMod: commod.idMod,
          modelName: snapshot.modelName,
          unitNo: snapshot.unitNo,
          projectCode: snapshot.projectCode,
          compDesc: snapshot.compDesc,
          hmComponent: snapshot.hmComponent,
          policy: snapshot.policy,
          lifePercent: snapshot.lifePercent,
          ratingSos: snapshot.ratingSos,
          ratingCbm: snapshot.ratingCbm,
          priceComponent: snapshot.priceComponent,
          snapshotAt: snapshot.snapshotAt,
          planPeriod,
          quarter,
          idRep: linkedIdRep,
          createdBy: createdBy ?? null,
          source: 'AUTO'
        }
      })

      created += 1
    }
  }

  return { created, skipped }
}

export type SubmitBaPcrPreview = {
  projectCode: string
  year: number
  romanMonth: string
  latestSequence: number
  suggestedSequence: number
  suggestedNoBaPcr: string
  sequenceLocked: boolean
  unitNo: string
  compDesc: string
}

export async function getSubmitBaPcrPreview(session: Session, idForecast: number): Promise<SubmitBaPcrPreview | null> {
  const existing = await prisma.pcrForecast.findFirst({
    where: { idForecast, deletedAt: null, ...getPrismaProjectFilter(session) }
  })

  if (!existing) return null

  if (!hasPermission(session, 'forecasts.submit')) {
    throw new Error('Only users with forecast submit permission can submit BA PCR')
  }

  if (existing.forecastStatus !== 'OPEN') throw new Error('Forecast is not OPEN')

  const activeBa = await prisma.baPcr.findFirst({ where: { idForecast, isActive: true } })
  if (!canSubmitBaPcr(activeBa)) {
    throw new Error('BA PCR already submitted or in review')
  }

  const submitDate = new Date()
  const year = submitDate.getFullYear()
  const latestSequence = await maxBaPcrSequenceForSiteYear(prisma, existing.projectCode, year)
  const suggestedSequence = latestSequence + 1

  return {
    projectCode: existing.projectCode,
    year,
    romanMonth: romanMonthFromDate(submitDate),
    latestSequence,
    suggestedSequence,
    suggestedNoBaPcr: formatBaPcrNumber(suggestedSequence, existing.projectCode, submitDate),
    sequenceLocked: false,
    unitNo: existing.unitNo,
    compDesc: existing.compDesc ?? ''
  }
}

export async function submitForecastBa(
  session: Session,
  idForecast: number,
  submittedBy: number,
  input: ForecastSubmitBaInput = {}
) {
  const existing = await prisma.pcrForecast.findFirst({
    where: { idForecast, deletedAt: null, ...getPrismaProjectFilter(session) },
    include: { baPcrs: { where: { isActive: true }, include: { approvals: true } } }
  })

  if (!existing) return null

  if (!hasPermission(session, 'forecasts.submit')) {
    throw new Error('Only users with forecast submit permission can submit BA PCR')
  }

  if (existing.forecastStatus !== 'OPEN') throw new Error('Forecast is not OPEN')

  const activeBa = pickActiveBaPcr(existing.baPcrs)
  if (!canSubmitBaPcr(activeBa)) {
    throw new Error('BA PCR already submitted or in review')
  }

  // Refresh life %, SOS/CBM, HM, etc. from latest data before locking the BA PCR snapshot.
  const refreshed = await refreshForecastMetrics(session, idForecast)
  if (!refreshed) {
    throw new Error('Forecast not found')
  }

  const submitDate = new Date()

  return prisma.$transaction(async tx => {
    if (activeBa) {
      await tx.baPcr.update({
        where: { idBaPcr: activeBa.idBaPcr },
        data: { isActive: false }
      })
    }

    const seq = input.sequence ?? (await nextBaPcrSequence(tx, existing.projectCode, submitDate))
    const noBaPcr = await assertBaPcrSequenceAvailable(tx, existing.projectCode, submitDate, seq)

    const baPcr = await tx.baPcr.create({
      data: {
        idForecast,
        isActive: true,
        noBaPcr,
        baPcrDate: submitDate,
        baPcrStatus: 'SUBMITTED',
        submittedBy,
        rejectedAt: null
      }
    })

    await tx.pcrForecastApproval.createMany({
      data: getPcrForecastApprovalSeedRows().map(level => ({
        idBaPcr: baPcr.idBaPcr,
        level: level.level,
        stepOrder: level.stepOrder,
        approverLabel: level.approverLabel,
        status: 'PENDING'
      }))
    })

    const approvals = await tx.pcrForecastApproval.findMany({ where: { idBaPcr: baPcr.idBaPcr } })

    await tx.baPcr.update({
      where: { idBaPcr: baPcr.idBaPcr },
      data: {
        statusBaPcr: syncStatusBaPcr(approvals, 'SUBMITTED')
      }
    })

    const row = await tx.pcrForecast.findUniqueOrThrow({
      where: { idForecast },
      include: forecastDetailInclude
    })

    return mapForecastRow(row)
  }).then(mapped => {
    if (mapped.idBaPcr && mapped.noBaPcr) {
      notifyApprovalPendingAsync({
        kind: 'PCR_FORECAST',
        documentId: mapped.idBaPcr,
        documentNo: mapped.noBaPcr,
        level: 'PS',
        unitNo: mapped.unitNo,
        projectCode: mapped.projectCode,
        compDesc: mapped.compDesc,
        actorName: session.user?.name ?? session.user?.email ?? null
      })
      logActivity({
        session,
        logName: 'approvals',
        event: 'submitted',
        description: `submitted BA PCR ${mapped.noBaPcr}`,
        subjectType: 'BaPcr',
        subjectId: mapped.idBaPcr,
        properties: {
          idForecast: mapped.idForecast,
          unitNo: mapped.unitNo,
          projectCode: mapped.projectCode
        }
      })
    }

    return mapped
  })
}

/** Admin-only cancel without linked WO close path. */
export async function closeForecast(session: Session, idForecast: number, input: ForecastCloseInput) {
  if (!hasPermission(session, 'system.admin')) {
    throw new Error('Only admin can cancel forecast without replacement close')
  }

  const existing = await getForecastById(session, idForecast)
  if (!existing) return null

  const row = await prisma.pcrForecast.update({
    where: { idForecast },
    data: {
      forecastStatus: 'CLOSED',
      remark: input.remark ?? existing.remark
    },
    include: forecastInclude
  })

  return mapForecastRow(row)
}

export async function convertForecastToReplacement(session: Session, idForecast: number) {
  const forecast = await prisma.pcrForecast.findFirst({
    where: { idForecast, deletedAt: null, ...getPrismaProjectFilter(session) },
    include: { baPcrs: { where: { isActive: true }, take: 1 } }
  })

  if (!forecast) return null

  if (forecast.forecastStatus !== 'OPEN') throw new Error('Forecast is not OPEN')
  if (resolveBaPcrStatus(pickActiveBaPcr(forecast.baPcrs)) !== 'APPROVED') {
    throw new Error('BA PCR must be fully approved before convert')
  }
  if (forecast.convertedAt) throw new Error('Forecast already converted')

  const flat = flattenForecastBaFields(forecast)
  if (!canUserConvertForecast(session, flat)) {
    throw new Error('Only Planner Foreman or the BA PCR submitter can convert this forecast')
  }

  const latestHm = await prisma.hm.findFirst({
    where: { fleetUnitId: forecast.fleetUnitId, deletedAt: null },
    orderBy: { dateHm: 'desc' }
  })

  return prisma.$transaction(async tx => {
    let idRep = forecast.idRep

    if (idRep == null) {
      const rep = await tx.replacement.create({
        data: {
          repDate: new Date(),
          fleetUnitId: forecast.fleetUnitId,
          idMod: forecast.idMod,
          hmRep: latestHm?.hmUnit ?? forecast.hmComponent,
          lastHmRep: 0,
          woStatus: 'OPEN',
          woDate: new Date(),
          compHour: 0,
          compCond: forecast.ratingSos ?? 'A',
          remarks: forecast.remark ?? '',
          unitNo: forecast.unitNo,
          projectCode: forecast.projectCode
        }
      })
      idRep = rep.idRep
    } else {
      const linked = await tx.replacement.findUnique({ where: { idRep } })
      if (!linked || linked.deletedAt) {
        throw new Error('Linked replacement not found')
      }
      if (linked.woStatus !== 'OPEN') {
        throw new Error('Linked replacement work order must be OPEN')
      }
    }

    const row = await tx.pcrForecast.update({
      where: { idForecast },
      data: { idRep, convertedAt: new Date() },
      include: forecastInclude
    })

    return mapForecastRow(row)
  })
}

export async function listForecastApprovals(session: Session) {
  const projectFilter = getPrismaProjectFilter(session)

  const forecasts = await prisma.pcrForecast.findMany({
    where: {
      deletedAt: null,
      forecastStatus: 'OPEN',
      baPcrs: { some: { isActive: true, baPcrStatus: { in: ['SUBMITTED', 'IN_REVIEW'] } } },
      ...projectFilter
    },
    include: {
      baPcrs: { where: { isActive: true }, include: { approvals: true }, take: 1 },
      unit: true,
      commod: { include: { comp: true } }
    },
    orderBy: [{ planPeriod: 'desc' }, { idForecast: 'desc' }]
  })

  const mapped = forecasts.map(f => flattenForecastBaFields(f))

  if (hasPermission(session, 'system.admin')) return mapped

  const levels = getForecastApprovalLevels(session)
  if (levels.length === 0) return []

  return mapped.filter(
    forecast => getPendingLevelsForSession(forecast.approvals ?? [], session).length > 0
  )
}

type ForecastApprovalsFilters = {
  quarter?: string | null
  projectCode?: string | null
  baPcrStatus?: string | null
  statusBaPcr?: string | null
  planPeriod?: string | null
  unitNo?: string | null
}

function resolveBaPcrStatusFilter(value?: string | null): Prisma.BaPcrWhereInput['baPcrStatus'] {
  if (value === 'pending' || value == null) {
    return { in: ['SUBMITTED', 'IN_REVIEW'] }
  }

  if (value === 'all' || value === '') {
    return { in: ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED'] }
  }

  if (value === 'approved') {
    return 'APPROVED'
  }

  if (value === 'rejected') {
    return 'REJECTED'
  }

  return value
}

type ForecastApprovalsQuery = ForecastApprovalsFilters & {
  page: number
  pageSize: number
  sortField?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

function buildForecastApprovalsWhere(
  session: Session,
  filters: ForecastApprovalsFilters,
  levels: string[],
  admin: boolean
): Prisma.PcrForecastWhereInput | null {
  if (!admin && levels.length === 0) return null

  const projectFilter = getPrismaProjectFilter(session)

  const activeBaWhere: Prisma.BaPcrWhereInput = {
    isActive: true,
    baPcrStatus: resolveBaPcrStatusFilter(filters.baPcrStatus)
  }

  if (filters.statusBaPcr) {
    activeBaWhere.statusBaPcr = resolveApprovalStageStatusFilter(filters.statusBaPcr)
  }

  const where: Prisma.PcrForecastWhereInput = {
    deletedAt: null,
    forecastStatus: 'OPEN',
    baPcrs: { some: activeBaWhere },
    ...projectFilter
  }

  if (isHeadOffice(session) && filters.projectCode) {
    where.projectCode = filters.projectCode
  }

  if (filters.quarter) where.quarter = filters.quarter
  if (filters.planPeriod) {
    const planPeriodWhere = buildPlanPeriodMonthWhere(filters.planPeriod)
    if (planPeriodWhere) where.planPeriod = planPeriodWhere
  }
  if (filters.unitNo?.trim()) {
    where.unitNo = { contains: filters.unitNo.trim() }
  }

  return where
}

function buildForecastApprovalsOrderBy(sortField?: string | null, sortOrder?: 'asc' | 'desc' | null): Prisma.PcrForecastOrderByWithRelationInput[] {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'

  if (!sortField) return [{ planPeriod: 'desc' }, { idForecast: 'desc' }]

  switch (sortField) {
    case 'unitNo':
      return [{ unitNo: direction }, { idForecast: direction }]
    case 'compDesc':
      if (sortOrder === 'asc') {
        return [{ compDesc: 'asc' }, { planPeriod: 'desc' }, { idForecast: 'desc' }]
      }

      return [{ compDesc: direction }, { idForecast: direction }]
    case 'quarter':
      return [{ quarter: direction }, { idForecast: direction }]
    case 'statusBaPcr':
    case 'baPcrStatus':
    case 'baSubmittedAt':
      return [{ planPeriod: direction }, { idForecast: direction }]
    default:
      return [{ planPeriod: 'desc' }, { idForecast: 'desc' }]
  }
}

export async function listForecastApprovalsPaginated(
  session: Session,
  query: ForecastApprovalsQuery
): Promise<PaginatedResult<ReturnType<typeof flattenForecastBaFields>>> {
  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0

  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 10

  const admin = hasPermission(session, 'system.admin')
  const levels = admin ? [] : getForecastApprovalLevels(session)

  const where = buildForecastApprovalsWhere(
    session,
    {
      quarter: query.quarter,
      projectCode: query.projectCode,
      baPcrStatus: query.baPcrStatus,
      statusBaPcr: query.statusBaPcr,
      planPeriod: query.planPeriod,
      unitNo: query.unitNo
    },
    levels,
    admin
  )

  if (!where) {
    return { total: 0, rows: [] }
  }

  const include = {
    baPcrs: { where: { isActive: true }, include: { approvals: true }, take: 1 },
    unit: true,
    commod: { include: { comp: true } }
  } as const satisfies Prisma.PcrForecastInclude

  const pendingQueue = !query.baPcrStatus || query.baPcrStatus === 'pending'
  const needsActionableFilter = !admin && pendingQueue

  if (needsActionableFilter) {
    const allRows = await prisma.pcrForecast.findMany({
      where,
      include,
      orderBy: buildForecastApprovalsOrderBy(query.sortField, query.sortOrder)
    })

    const filtered = allRows
      .map(flattenForecastBaFields)
      .filter(
        forecast => getPendingLevelsForSession(forecast.approvals ?? [], session).length > 0
      )

    const skip = page * pageSize

    return {
      total: filtered.length,
      rows: filtered.slice(skip, skip + pageSize)
    }
  }

  const [total, rows] = await Promise.all([
    prisma.pcrForecast.count({ where }),
    prisma.pcrForecast.findMany({
      where,
      include,
      orderBy: buildForecastApprovalsOrderBy(query.sortField, query.sortOrder),
      skip: page * pageSize,
      take: pageSize
    })
  ])

  return { total, rows: rows.map(flattenForecastBaFields) }
}

export async function approveForecastLevel(
  session: Session,
  idForecastApproval: number,
  approvedBy: number,
  note?: string | null
) {
  const approval = await prisma.pcrForecastApproval.findUnique({
    where: { idForecastApproval },
    include: {
      baPcr: {
        include: {
          approvals: true,
          forecast: true
        }
      }
    }
  })

  if (!approval?.baPcr) return null

  if (!canApproveAtLevel(approval.baPcr.approvals, approval.level as never, session)) {
    throw new Error('You cannot approve at this stage')
  }

  await prisma.pcrForecastApproval.update({
    where: { idForecastApproval },
    data: {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
      note: note ?? null
    }
  })

  const approvals = await prisma.pcrForecastApproval.findMany({
    where: { idBaPcr: approval.idBaPcr }
  })

  const fullyApproved = isFullyApproved(approvals)
  const baPcrStatus = fullyApproved ? 'APPROVED' : 'IN_REVIEW'

  await prisma.baPcr.update({
    where: { idBaPcr: approval.idBaPcr },
    data: {
      baPcrStatus,
      statusBaPcr: syncStatusBaPcr(approvals, baPcrStatus),
      approvedAt: fullyApproved ? new Date() : null
    }
  })

  const row = await prisma.pcrForecast.findUniqueOrThrow({
    where: { idForecast: approval.baPcr.idForecast },
    include: forecastDetailInclude
  })

  const mapped = mapForecastRow(row)
  const actorName = session.user?.name ?? session.user?.email ?? null
  const documentId = approval.idBaPcr
  const documentNo = approval.baPcr.noBaPcr ?? `BA-PCR-${documentId}`

  notifyApprovalDecisionAsync({
    kind: 'PCR_FORECAST',
    documentId,
    documentNo,
    decision: 'APPROVED',
    level: approval.level,
    levelLabel: approval.approverLabel,
    unitNo: mapped.unitNo,
    projectCode: mapped.projectCode,
    compDesc: mapped.compDesc,
    actorName,
    remark: note ?? null,
    submitterUserId: approval.baPcr.submittedBy
  })

  logActivity({
    session,
    logName: 'approvals',
    event: 'approved',
    description: `approved BA PCR ${documentNo} at ${approval.level}`,
    subjectType: 'BaPcr',
    subjectId: documentId,
    properties: { level: approval.level, unitNo: mapped.unitNo, projectCode: mapped.projectCode }
  })

  if (fullyApproved) {
    notifyFullyApprovedAsync({
      kind: 'PCR_FORECAST',
      documentId,
      documentNo,
      unitNo: mapped.unitNo,
      projectCode: mapped.projectCode,
      compDesc: mapped.compDesc,
      actorName,
      submitterUserId: approval.baPcr.submittedBy
    })
  } else {
    const nextLevel = getCurrentPendingPcrLevel(approvals)
    if (nextLevel) {
      notifyApprovalPendingAsync({
        kind: 'PCR_FORECAST',
        documentId,
        documentNo,
        level: nextLevel,
        unitNo: mapped.unitNo,
        projectCode: mapped.projectCode,
        compDesc: mapped.compDesc,
        actorName
      })
    }
  }

  return mapped
}

export async function rejectForecastLevel(
  session: Session,
  idForecastApproval: number,
  approvedBy: number,
  note?: string
) {
  const approval = await prisma.pcrForecastApproval.findUnique({
    where: { idForecastApproval },
    include: {
      baPcr: {
        include: {
          approvals: true,
          forecast: true
        }
      }
    }
  })

  if (!approval?.baPcr) return null

  if (!canRejectAtLevel(approval.baPcr.approvals, approval.level as never, session)) {
    throw new Error('You cannot reject at this stage')
  }

  await prisma.pcrForecastApproval.update({
    where: { idForecastApproval },
    data: {
      status: 'REJECTED',
      approvedBy,
      approvedAt: new Date(),
      note: note ?? null
    }
  })

  const approvals = await prisma.pcrForecastApproval.findMany({
    where: { idBaPcr: approval.idBaPcr }
  })

  const rejectedAt = new Date()

  const rejector = await prisma.user.findUnique({
    where: { idUser: approvedBy },
    select: { idUser: true, fullName: true, username: true }
  })
  const baPcr = approval.baPcr

  await prisma.baPcr.update({
    where: { idBaPcr: approval.idBaPcr },
    data: {
      baPcrStatus: 'REJECTED',
      statusBaPcr: syncStatusBaPcr(approvals, 'REJECTED'),
      rejectedAt,
      rejectionHistory: appendRejectionHistory(baPcr.rejectionHistory, {
        rejectedAt: rejectedAt.toISOString(),
        submittedAt: baPcr.baPcrDate ? baPcr.baPcrDate.toISOString().slice(0, 10) : null,
        noBaPcr: baPcr.noBaPcr ?? null,
        level: approval.level,
        levelLabel: approval.approverLabel ?? null,
        note: note ?? null,
        rejectedBy: approvedBy,
        rejectedByName: formatRejectorName(rejector)
      })
    }
  })

  const row = await prisma.pcrForecast.findUniqueOrThrow({
    where: { idForecast: approval.baPcr.idForecast },
    include: forecastDetailInclude
  })

  const mapped = mapForecastRow(row)
  notifyApprovalDecisionAsync({
    kind: 'PCR_FORECAST',
    documentId: approval.idBaPcr,
    documentNo: baPcr.noBaPcr ?? `BA-PCR-${approval.idBaPcr}`,
    decision: 'REJECTED',
    level: approval.level,
    levelLabel: approval.approverLabel,
    unitNo: mapped.unitNo,
    projectCode: mapped.projectCode,
    compDesc: mapped.compDesc,
    actorName: session.user?.name ?? session.user?.email ?? null,
    remark: note ?? null,
    submitterUserId: baPcr.submittedBy
  })

  logActivity({
    session,
    logName: 'approvals',
    event: 'rejected',
    description: `rejected BA PCR ${baPcr.noBaPcr ?? approval.idBaPcr} at ${approval.level}`,
    subjectType: 'BaPcr',
    subjectId: approval.idBaPcr,
    properties: { level: approval.level, unitNo: mapped.unitNo, note: note ?? null }
  })

  return mapped
}

export async function revokeForecastLevel(session: Session, idForecastApproval: number) {
  const approval = await prisma.pcrForecastApproval.findUnique({
    where: { idForecastApproval },
    include: {
      baPcr: {
        include: {
          approvals: true,
          forecast: true
        }
      }
    }
  })

  if (!approval?.baPcr) return null

  if (!canRevokeApproval(approval.baPcr.approvals, approval.level as never, session)) {
    throw new Error('You cannot revoke approval at this stage')
  }

  await prisma.pcrForecastApproval.update({
    where: { idForecastApproval },
    data: {
      status: 'PENDING',
      approvedBy: null,
      approvedAt: null,
      note: null
    }
  })

  const approvals = await prisma.pcrForecastApproval.findMany({
    where: { idBaPcr: approval.idBaPcr }
  })

  await prisma.baPcr.update({
    where: { idBaPcr: approval.idBaPcr },
    data: {
      baPcrStatus: 'IN_REVIEW',
      statusBaPcr: syncStatusBaPcr(approvals, 'IN_REVIEW'),
      approvedAt: null
    }
  })

  const row = await prisma.pcrForecast.findUniqueOrThrow({
    where: { idForecast: approval.baPcr.idForecast },
    include: forecastDetailInclude
  })

  const mapped = mapForecastRow(row)
  const documentId = approval.idBaPcr
  const documentNo = approval.baPcr.noBaPcr ?? `BA-PCR-${documentId}`
  const actorName = session.user?.name ?? session.user?.email ?? null

  notifyApprovalDecisionAsync({
    kind: 'PCR_FORECAST',
    documentId,
    documentNo,
    decision: 'REVOKED',
    level: approval.level,
    levelLabel: approval.approverLabel,
    unitNo: mapped.unitNo,
    projectCode: mapped.projectCode,
    compDesc: mapped.compDesc,
    actorName,
    submitterUserId: approval.baPcr.submittedBy
  })

  const nextLevel = getCurrentPendingPcrLevel(approvals)
  if (nextLevel) {
    notifyApprovalPendingAsync({
      kind: 'PCR_FORECAST',
      documentId,
      documentNo,
      level: nextLevel,
      unitNo: mapped.unitNo,
      projectCode: mapped.projectCode,
      compDesc: mapped.compDesc,
      actorName
    })
  }

  return mapped
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** Plan period date → month key YYYY-MM-01 and short label (e.g. Apr-26). */
function toPlanPeriodKey(planPeriod: Date | string): { key: string; label: string } {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso || !/^\d{4}-\d{2}/.test(iso)) {
    return { key: '', label: '(blank)' }
  }

  const key = `${iso.slice(0, 7)}-01`
  const year = iso.slice(2, 4)
  const month = Number(iso.slice(5, 7))

  return { key, label: `${MONTHS_SHORT[month - 1]}-${year}` }
}

export type ForecastPeriodMatrixFilters = {
  projectCode?: string | null
  status?: string | null

  /** Independent of project — matches denormalized forecast.modelName. */
  modelName?: string | null

  /** Independent of project — matches denormalized forecast.compDesc. */
  compDesc?: string | null
}

export type ForecastPeriodMatrixRow = {
  modelName: string
  compDesc: string
  counts: Record<string, number>
  total: number
}

export type ForecastPeriodMatrixGroup = {
  modelName: string
  rows: ForecastPeriodMatrixRow[]
  totals: Record<string, number>
  total: number
}

export type ForecastPeriodMatrixResult = {
  periods: Array<{ key: string; label: string }>
  groups: ForecastPeriodMatrixGroup[]
  grandTotals: Record<string, number>
  grandTotal: number
  metric: 'count' | 'price'
}

function buildMatrixWhere(session: Session, filters: ForecastPeriodMatrixFilters): Prisma.PcrForecastWhereInput {
  const where = buildListWhere(session, {
    projectCode: filters.projectCode,
    status: filters.status
  })

  if (filters.modelName?.trim()) {
    where.modelName = filters.modelName.trim()
  }

  if (filters.compDesc?.trim()) {
    where.compDesc = filters.compDesc.trim()
  }

  return where
}

function assembleForecastMatrix(
  cells: Array<{ modelName: string; compDesc: string; periodKey: string; periodLabel: string; value: number }>,
  metric: 'count' | 'price'
): ForecastPeriodMatrixResult {
  const periodMap = new Map<string, string>()
  const cellMap = new Map<string, Map<string, number>>()

  for (const cell of cells) {
    if (!cell.periodKey || !cell.value) continue

    periodMap.set(cell.periodKey, cell.periodLabel)

    const rowKey = `${cell.modelName}\0${cell.compDesc}`
    let counts = cellMap.get(rowKey)
    if (!counts) {
      counts = new Map()
      cellMap.set(rowKey, counts)
    }

    counts.set(cell.periodKey, (counts.get(cell.periodKey) ?? 0) + cell.value)
  }

  const periods = [...periodMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, label]) => ({ key, label }))

  const groupMap = new Map<string, ForecastPeriodMatrixGroup>()

  for (const [rowKey, counts] of cellMap) {
    const [modelName, compDesc] = rowKey.split('\0')
    const countRecord: Record<string, number> = {}
    let total = 0

    for (const { key } of periods) {
      const n = counts.get(key) ?? 0
      if (n > 0) countRecord[key] = n
      total += n
    }

    let group = groupMap.get(modelName)
    if (!group) {
      group = { modelName, rows: [], totals: {}, total: 0 }
      groupMap.set(modelName, group)
    }

    group.rows.push({ modelName, compDesc, counts: countRecord, total })

    for (const [key, n] of Object.entries(countRecord)) {
      group.totals[key] = (group.totals[key] ?? 0) + n
    }
    group.total += total
  }

  const groups = [...groupMap.values()].sort((a, b) => a.modelName.localeCompare(b.modelName))

  const grandTotals: Record<string, number> = {}
  let grandTotal = 0
  for (const group of groups) {
    for (const [key, n] of Object.entries(group.totals)) {
      grandTotals[key] = (grandTotals[key] ?? 0) + n
    }
    grandTotal += group.total
  }

  return { periods, groups, grandTotals, grandTotal, metric }
}

/**
 * Pivot: count of forecasts by Model Unit → Component across Plan Periode months.
 * Filters: project, status, modelName, compDesc (model/comp independent of project).
 */
export async function listForecastPeriodMatrix(
  session: Session,
  filters: ForecastPeriodMatrixFilters = {}
): Promise<ForecastPeriodMatrixResult> {
  const where = buildMatrixWhere(session, filters)

  const grouped = await prisma.pcrForecast.groupBy({
    by: ['modelName', 'compDesc', 'planPeriod'],
    where,
    _count: { _all: true },
    orderBy: [{ modelName: 'asc' }, { compDesc: 'asc' }, { planPeriod: 'asc' }]
  })

  const cells = grouped.map(row => {
    const { key, label } = toPlanPeriodKey(row.planPeriod)

    return {
      modelName: row.modelName?.trim() || '(blank)',
      compDesc: row.compDesc?.trim() || '(blank)',
      periodKey: key,
      periodLabel: label,
      value: row._count._all
    }
  })

  return assembleForecastMatrix(cells, 'count')
}

/**
 * Pivot: sum of priceComponent by Model Unit → Component across Plan Periode months.
 */
export async function listForecastPriceMatrix(
  session: Session,
  filters: ForecastPeriodMatrixFilters = {}
): Promise<ForecastPeriodMatrixResult> {
  const where = buildMatrixWhere(session, filters)

  const grouped = await prisma.pcrForecast.groupBy({
    by: ['modelName', 'compDesc', 'planPeriod'],
    where,
    _sum: { priceComponent: true },
    orderBy: [{ modelName: 'asc' }, { compDesc: 'asc' }, { planPeriod: 'asc' }]
  })

  const cells = grouped.map(row => {
    const { key, label } = toPlanPeriodKey(row.planPeriod)
    const sum = row._sum.priceComponent != null ? Number(row._sum.priceComponent) : 0

    return {
      modelName: row.modelName?.trim() || '(blank)',
      compDesc: row.compDesc?.trim() || '(blank)',
      periodKey: key,
      periodLabel: label,
      value: Number.isFinite(sum) ? sum : 0
    }
  })

  return assembleForecastMatrix(cells, 'price')
}
