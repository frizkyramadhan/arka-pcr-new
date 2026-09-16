import type { Session } from 'next-auth'

import { calculateComponentLife } from '@/lib/calculations/life'
import { getPendingLevelForBa, isBaFullyApproved } from '@/lib/cannibal/approval-workflow'
import { BA_APPROVAL_LEVELS } from '@/lib/cannibal/types'
import {
  OLDCORE_STATUS_LABELS,
  OLDCORE_STATUSES,
  PREDICTION_OLDCORE_LABELS,
  PREDICTION_OLDCORES
} from '@/lib/replacement/close-requirements'
import {
  PCR_RETURN_TO_LABELS,
  PCR_SUPPLY_CATEGORY_LABELS,
  PCR_SUPPLY_CATEGORIES,
  REPAIR_LIFE_MODE_LABELS,
  normalizeLifetimeMode,
  type PcrReturnTo,
  type PcrSupplyCategory
} from '@/lib/forecasts/pcr-supply'
import { enrichReplacementsWithLiveMetrics } from '@/lib/replacement/life-metrics'
import { prisma } from '@/lib/prisma'
import { getPrismaProjectFilter } from '@/lib/utils/project-scope'

export type CriticalComponentRow = {
  fleetUnitId: number
  idMod: number
  unitNo: string
  compDesc: string
  lifePercent: number
  source: 'forecast' | 'wo'
}

export type ForecastQuarterSummary = {
  quarter: string
  open: number
  closed: number
  totalPriceOpen: number
  totalPriceClosed: number
}

export type NamedCount = {
  key: string
  label: string
  count: number
}

export type StrategicInsights = {

  // CLOSED WO in plan year with classification filled
  closedClassified: number
  closedUnclassified: number
  oldcoreStatus: NamedCount[]
  predictionOldcore: NamedCount[]

  // Forecasts in plan year
  forecastSupply: NamedCount[]
  lifetimeMode: NamedCount[]
  returnTo: NamedCount[]
  otherUnitPlans: number
  warrantyPlans: number
}

export type DashboardStats = {
  year: number
  pendingBaApprovals: Record<(typeof BA_APPROVAL_LEVELS)[number], number>
  pendingPcrApprovals: Record<string, number>
  cannibalAwaitingApproval: number
  forecastQuarter: ForecastQuarterSummary[]
  criticalComponents: CriticalComponentRow[]
  strategic: StrategicInsights
  totals: {
    equipment: number
    openForecasts: number
    openReplacements: number
    submittedBa: number
    pendingApprovals: number
    berClosed: number
    firstLife80: number
    secondLife60: number
    otherUnitPlans: number
  }
}

function projectWhere(session: Session) {
  return getPrismaProjectFilter(session)
}

function yearBounds(year: number) {
  return {
    gte: new Date(`${year}-01-01`),
    lte: new Date(`${year}-12-31`)
  }
}

function emptyNamedCounts(
  keys: readonly string[],
  labels: Record<string, string>
): NamedCount[] {
  return keys.map(key => ({ key, label: labels[key] ?? key, count: 0 }))
}

function bumpNamed(rows: NamedCount[], key: string) {
  const row = rows.find(item => item.key === key)
  if (row) row.count += 1
}

async function getStrategicInsights(session: Session, year: number): Promise<StrategicInsights> {
  const projectFilter = projectWhere(session)
  const bounds = yearBounds(year)

  const [closedRows, forecastRows] = await Promise.all([
    prisma.replacement.findMany({
      where: {
        deletedAt: null,
        woStatus: 'CLOSE',
        OR: [{ woEndDate: bounds }, { AND: [{ woEndDate: null }, { repDate: bounds }] }],
        ...projectFilter
      },
      select: { oldcoreStatus: true, predictionOldcore: true }
    }),
    prisma.pcrForecast.findMany({
      where: {
        deletedAt: null,
        planPeriod: bounds,
        ...projectFilter
      },
      select: {
        isWarranty: true,
        pcrSupplyCategory: true,
        repairLifeMode: true,
        pcrReturnTo: true,
        cannibalNoBa: true
      }
    })
  ])

  const oldcoreStatus = emptyNamedCounts(OLDCORE_STATUSES, OLDCORE_STATUS_LABELS)
  const predictionOldcore = emptyNamedCounts(PREDICTION_OLDCORES, PREDICTION_OLDCORE_LABELS)
  let closedClassified = 0
  let closedUnclassified = 0

  for (const row of closedRows) {
    const hasClass = Boolean(row.oldcoreStatus || row.predictionOldcore)
    if (hasClass) closedClassified += 1
    else closedUnclassified += 1

    if (row.oldcoreStatus && (OLDCORE_STATUSES as readonly string[]).includes(row.oldcoreStatus)) {
      bumpNamed(oldcoreStatus, row.oldcoreStatus)
    }
    if (
      row.predictionOldcore &&
      (PREDICTION_OLDCORES as readonly string[]).includes(row.predictionOldcore)
    ) {
      bumpNamed(predictionOldcore, row.predictionOldcore)
    }
  }

  const forecastSupply = emptyNamedCounts(PCR_SUPPLY_CATEGORIES, PCR_SUPPLY_CATEGORY_LABELS)
  forecastSupply.push({ key: 'WARRANTY', label: 'Warranty', count: 0 })

  const lifetimeMode: NamedCount[] = [
    { key: 'CONTINUE_LIFE', label: REPAIR_LIFE_MODE_LABELS.CONTINUE_LIFE, count: 0 },
    { key: 'BACK_TO_ZERO', label: REPAIR_LIFE_MODE_LABELS.BACK_TO_ZERO, count: 0 }
  ]

  const returnTo = emptyNamedCounts(
    ['ORIGINAL_UNIT', 'OTHER_UNIT'] as const,
    PCR_RETURN_TO_LABELS as Record<string, string>
  )

  let otherUnitPlans = 0
  let warrantyPlans = 0

  for (const row of forecastRows) {
    if (row.isWarranty) {
      warrantyPlans += 1
      bumpNamed(forecastSupply, 'WARRANTY')
      continue
    }

    const category = row.pcrSupplyCategory as PcrSupplyCategory | null
    if (category && (PCR_SUPPLY_CATEGORIES as readonly string[]).includes(category)) {
      bumpNamed(forecastSupply, category)
    }

    const life = normalizeLifetimeMode(row.repairLifeMode)
    if (life) bumpNamed(lifetimeMode, life)

    const ret = row.pcrReturnTo as PcrReturnTo | null
    if (ret && (ret === 'ORIGINAL_UNIT' || ret === 'OTHER_UNIT')) {
      bumpNamed(returnTo, ret)
      if (ret === 'OTHER_UNIT') otherUnitPlans += 1
    }
  }

  return {
    closedClassified,
    closedUnclassified,
    oldcoreStatus,
    predictionOldcore,
    forecastSupply,
    lifetimeMode,
    returnTo,
    otherUnitPlans,
    warrantyPlans
  }
}

async function getCriticalComponents(session: Session, limit = 10): Promise<CriticalComponentRow[]> {
  const projectFilter = projectWhere(session)

  const [forecasts, openWos] = await Promise.all([
    prisma.pcrForecast.findMany({
      where: {
        deletedAt: null,
        forecastStatus: 'OPEN',
        lifePercent: { gte: 85 },
        ...projectFilter
      },
      include: { commod: { include: { comp: true } } },
      orderBy: { lifePercent: 'desc' },
      take: limit * 2
    }),
    prisma.replacement.findMany({
      where: { deletedAt: null, woStatus: 'OPEN', ...projectFilter },
      include: { commod: { include: { comp: true } } },
      take: 100
    })
  ])

  const enrichedWos = await enrichReplacementsWithLiveMetrics(openWos)
  const map = new Map<string, CriticalComponentRow>()

  for (const forecast of forecasts) {
    const key = `${forecast.fleetUnitId}-${forecast.idMod}`

    map.set(key, {
      fleetUnitId: forecast.fleetUnitId,
      idMod: forecast.idMod,
      unitNo: forecast.unitNo,
      compDesc: forecast.compDesc ?? forecast.commod?.comp?.compDesc ?? '—',
      lifePercent: Number(forecast.lifePercent),
      source: 'forecast'
    })
  }

  for (const wo of enrichedWos) {
    if (!wo.liveMetrics?.isCritical) continue

    const key = `${wo.fleetUnitId}-${wo.idMod}`
    const existing = map.get(key)
    const lifePercent = wo.liveMetrics.lifePercent

    if (!existing || lifePercent > existing.lifePercent) {
      map.set(key, {
        fleetUnitId: wo.fleetUnitId,
        idMod: wo.idMod,
        unitNo: wo.unitNo,
        compDesc: wo.commod?.comp?.compDesc ?? '—',
        lifePercent,
        source: 'wo'
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.lifePercent - a.lifePercent)
    .slice(0, limit)
}

async function getForecastQuarterSummary(session: Session, year?: number): Promise<ForecastQuarterSummary[]> {
  const projectFilter = projectWhere(session)
  const targetYear = year ?? new Date().getFullYear()

  const rows = await prisma.pcrForecast.findMany({
    where: {
      deletedAt: null,
      planPeriod: {
        gte: new Date(`${targetYear}-01-01`),
        lte: new Date(`${targetYear}-12-31`)
      },
      ...projectFilter
    },
    select: { quarter: true, forecastStatus: true, priceComponent: true }
  })

  const byQuarter = new Map<string, ForecastQuarterSummary>()

  for (const quarter of ['Q1', 'Q2', 'Q3', 'Q4']) {
    byQuarter.set(quarter, {
      quarter,
      open: 0,
      closed: 0,
      totalPriceOpen: 0,
      totalPriceClosed: 0
    })
  }

  for (const row of rows) {
    const bucket = byQuarter.get(row.quarter) ?? {
      quarter: row.quarter,
      open: 0,
      closed: 0,
      totalPriceOpen: 0,
      totalPriceClosed: 0
    }

    const price = row.priceComponent ? Number(row.priceComponent) : 0

    if (row.forecastStatus === 'CLOSED') {
      bucket.closed += 1
      bucket.totalPriceClosed += price
    } else {
      bucket.open += 1
      bucket.totalPriceOpen += price
    }

    byQuarter.set(row.quarter, bucket)
  }

  return Array.from(byQuarter.values())
}

export async function getDashboardStats(session: Session, year?: number): Promise<DashboardStats> {
  const projectFilter = projectWhere(session)
  const targetYear = year && !Number.isNaN(year) ? year : new Date().getFullYear()

  const [
    pcrPendingGroups,
    cannibalRows,
    equipmentCount,
    openForecasts,
    openReplacements,
    submittedBa,
    forecastQuarter,
    criticalComponents,
    strategic
  ] = await Promise.all([
    prisma.pcrForecastApproval.groupBy({
      by: ['level'],
      where: {
        status: 'PENDING',
        baPcr: {
          isActive: true,
          forecast: { deletedAt: null, ...projectFilter }
        }
      },
      _count: { _all: true }
    }),
    prisma.ba.findMany({
      where: {
        deletedAt: null,
        statusBa: { in: ['SUBMITTED', 'OPEN'] },
        ...projectFilter
      },
      select: {
        statusBa: true,
        projectCode: true,
        approvals: { select: { level: true, status: true } }
      }
    }),
    prisma.fleetUnitCache.count({ where: projectFilter }),
    prisma.pcrForecast.count({ where: { deletedAt: null, forecastStatus: 'OPEN', ...projectFilter } }),
    prisma.replacement.count({ where: { deletedAt: null, woStatus: 'OPEN', ...projectFilter } }),
    prisma.ba.count({ where: { deletedAt: null, statusBa: { in: ['SUBMITTED', 'OPEN'] }, ...projectFilter } }),
    getForecastQuarterSummary(session, targetYear),
    getCriticalComponents(session, 10),
    getStrategicInsights(session, targetYear)
  ])

  const pendingPcrApprovals: Record<string, number> = {}
  for (const group of pcrPendingGroups) {
    pendingPcrApprovals[group.level] = group._count._all
  }

  const pendingBaApprovals = Object.fromEntries(BA_APPROVAL_LEVELS.map(level => [level, 0])) as Record<
    (typeof BA_APPROVAL_LEVELS)[number],
    number
  >

  for (const row of cannibalRows) {
    const pendingLevel = getPendingLevelForBa(row)
    if (pendingLevel) pendingBaApprovals[pendingLevel] += 1
  }

  const cannibalAwaitingApproval = cannibalRows.filter(row => !isBaFullyApproved(row.approvals)).length
  const pendingPcrTotal = Object.values(pendingPcrApprovals).reduce((sum, n) => sum + n, 0)
  const pendingBaTotal = Object.values(pendingBaApprovals).reduce((sum, n) => sum + n, 0)

  const firstLife80 = strategic.oldcoreStatus.find(r => r.key === 'FIRST_LIFE_80')?.count ?? 0
  const secondLife60 = strategic.oldcoreStatus.find(r => r.key === 'SECOND_LIFE_60')?.count ?? 0
  const berClosed = strategic.predictionOldcore.find(r => r.key === 'BER')?.count ?? 0

  return {
    year: targetYear,
    pendingBaApprovals,
    pendingPcrApprovals,
    cannibalAwaitingApproval,
    forecastQuarter,
    criticalComponents,
    strategic,
    totals: {
      equipment: equipmentCount,
      openForecasts,
      openReplacements,
      submittedBa,
      pendingApprovals: pendingPcrTotal + pendingBaTotal,
      berClosed,
      firstLife80,
      secondLife60,
      otherUnitPlans: strategic.otherUnitPlans
    }
  }
}

export async function computeEquipmentCriticalCount(session: Session): Promise<number> {
  const components = await getCriticalComponents(session, 500)

  return components.length
}

export async function listLiveCriticalFromReplacements(session: Session) {
  const projectFilter = projectWhere(session)

  const openWos = await prisma.replacement.findMany({
    where: { deletedAt: null, woStatus: 'OPEN', ...projectFilter },
    include: { commod: { include: { comp: true } }, unit: true }
  })

  const enriched = await enrichReplacementsWithLiveMetrics(openWos)

  return enriched.filter(row => row.liveMetrics?.isCritical)
}

export async function computeLifeForEquipmentComponent(fleetUnitId: number, idMod: number, policy: number) {
  const [latestHm, lastRep] = await Promise.all([
    prisma.hm.findFirst({
      where: { fleetUnitId, deletedAt: null },
      orderBy: { dateHm: 'desc' }
    }),
    prisma.replacement.findFirst({
      where: { fleetUnitId, idMod, woStatus: 'CLOSE', deletedAt: null },
      orderBy: { repDate: 'desc' }
    })
  ])

  const hmNow = Number(latestHm?.hmUnit ?? 0)

  return calculateComponentLife({
    hmNow,
    hmLastReplacement: Number(lastRep?.hmRep ?? 0),
    compHour: lastRep?.compHour ?? 0,
    policy: policy ?? 1
  })
}
