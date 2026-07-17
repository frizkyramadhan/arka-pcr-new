import type { Session } from 'next-auth'

import { calculateComponentLife } from '@/lib/calculations/life'
import { getPendingLevelForBa, isBaFullyApproved } from '@/lib/cannibal/approval-workflow'
import { BA_APPROVAL_LEVELS } from '@/lib/cannibal/types'
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

export type DashboardStats = {
  year: number
  pendingBaApprovals: Record<(typeof BA_APPROVAL_LEVELS)[number], number>
  pendingPcrApprovals: Record<string, number>
  cannibalAwaitingApproval: number
  forecastQuarter: ForecastQuarterSummary[]
  criticalComponents: CriticalComponentRow[]
  totals: {
    equipment: number
    openForecasts: number
    openReplacements: number
    submittedBa: number
    pendingApprovals: number
  }
}

function projectWhere(session: Session) {
  return getPrismaProjectFilter(session)
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
    criticalComponents
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
    getCriticalComponents(session, 10)
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

  return {
    year: targetYear,
    pendingBaApprovals,
    pendingPcrApprovals,
    cannibalAwaitingApproval,
    forecastQuarter,
    criticalComponents,
    totals: {
      equipment: equipmentCount,
      openForecasts,
      openReplacements,
      submittedBa,
      pendingApprovals: pendingPcrTotal + pendingBaTotal
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
