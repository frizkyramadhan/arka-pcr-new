import type { Prisma, Replacement } from '@prisma/client'
import type { Session } from 'next-auth'

import { estimateRulByRegression, type RulEstimateResult } from '@/lib/calculations/rul'
import { getCachedUnit } from '@/lib/fleet-api/db-cache'
import { getUnitHmReadingsForRul } from '@/lib/hour-meter/service'
import { canAddReplacementForComponent } from '@/lib/replacement/cycle'
import {
  mapReplacementLinkedForecast,
  replacementForecastInclude,
  type ReplacementLinkedForecast
} from '@/lib/replacement/forecast-link'
import { resolveLifeAnchorHm, resolveOpenHmRepDisplay } from '@/lib/replacement/hm-rep'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { canAccessProject, getPrismaProjectFilter } from '@/lib/utils/project-scope'

const replacementInclude = {
  commod: { include: { comp: true } },
  unit: true,
  forecast: { where: { deletedAt: null }, select: replacementForecastInclude }
} satisfies Prisma.ReplacementInclude

type ReplacementRow = Prisma.ReplacementGetPayload<{ include: typeof replacementInclude }>

export type ReplacementHistoryDisplayRow = {
  idRep: number
  fleetUnitId: number
  idMod: number
  lifePercent: number | null
  compLife: number | null
  compCond: string
  hmUnit: number | null
  whDay: number | null
  woNo: string | null
  woDate: string | null
  woStatus: string
  woEndDate: string | null
  compHour: number | null
  lastHmRep: number | null
  lastRepDate: string | null
  nextReplacementDate: string | null
  /** RUL by AI (regresi) — info tambahan di samping nextReplacementDate, null bila data HM kurang. */
  rulEstimate: {
    estimatedDate: string
    confidenceLowDate: string | null
    confidenceHighDate: string | null
    method: string
    dataPoints: number
  } | null
  mrNo: string | null
  prNo: string | null
  poNo: string | null
  report: string | null
  remarks: string
  linkedForecast: ReplacementLinkedForecast | null
}

function mapRulEstimateForDisplay(rul: RulEstimateResult | null) {
  if (!rul) return null

  return {
    estimatedDate: toIsoDateOnly(rul.estimatedDate) as string,
    confidenceLowDate: toIsoDateOnly(rul.confidenceLowDate),
    confidenceHighDate: toIsoDateOnly(rul.confidenceHighDate),
    method: rul.method,
    dataPoints: rul.dataPoints
  }
}

export type ReplacementComponentDetailContext = {
  unit: {
    fleetUnitId: number
    unitNo: string
    description: string
    projectCode: string
    model: string
    modelId: number
  }
  component: {
    idMod: number
    compDesc: string
    compType: string | null
    policy: number | null
    price: Prisma.Decimal | null
  }
  avgWhDay: number
  latestHmUnit: number | null
  latestHmDate: string | null
}

export type ReplacementComponentDetailResult = ReplacementComponentDetailContext & {
  total: number
  rows: ReplacementHistoryDisplayRow[]
  canAddReplacement: boolean
}

type DetailQuery = {
  page: number
  pageSize: number
}

/** Legacy getAvg — AVG(wh_day) HM 3 bulan terakhir per unit. */
async function getUnitAvgWhDay(fleetUnitId: number): Promise<number> {
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const agg = await prisma.hm.aggregate({
    where: {
      fleetUnitId,
      deletedAt: null,
      dateHm: {
        lte: new Date(),
        gte: threeMonthsAgo
      }
    },
    _avg: { whDay: true }
  })

  return Math.round(agg._avg.whDay ?? 0)
}

/**
 * Legacy replacement.php — OPEN WO only:
 * comp_life = (hm_unit - last_hm_rep) + comp_hour
 * life% = round((comp_life / policy) * 100, 1)
 * next = today + round((policy - comp_life) / wh_day) days (0 if wh_day = 0)
 */
function buildDisplayRow(
  row: ReplacementRow,
  avgWhDay: number,
  latestHmUnit: number,
  fleetUnitId: number,
  idMod: number,
  hmReadingsForRul: Array<{ date: Date; hmUnit: number }>
): ReplacementHistoryDisplayRow {
  const policy = row.commod?.policy ?? 1
  const policyDivisor = policy > 0 ? policy : 1
  const isOpen = row.woStatus === 'OPEN'

  let lifePercent: number | null = null
  let compLife: number | null = null
  let hmUnit: number | null = null
  let nextReplacementDate: string | null = null
  let rulEstimate: ReplacementHistoryDisplayRow['rulEstimate'] = null

  if (isOpen) {
    const lastHmRep = resolveLifeAnchorHm(row)
    const compHour = row.compHour ?? 0
    const currentLife = (latestHmUnit - lastHmRep) + compHour

    compLife = currentLife
    lifePercent = Math.round((currentLife / policyDivisor) * 1000) / 10

    const forecastDays = avgWhDay === 0 ? 0 : Math.round((policyDivisor - currentLife) / avgWhDay)
    const next = new Date()
    next.setDate(next.getDate() + forecastDays)
    nextReplacementDate = next.toISOString().slice(0, 10)

    rulEstimate = mapRulEstimateForDisplay(estimateRulByRegression(hmReadingsForRul, currentLife, policyDivisor))
  } else {
    lifePercent = Number(row.lifePercent)
    compLife = Number(row.compLife)
  }

  hmUnit = resolveOpenHmRepDisplay(row, latestHmUnit)

  return {
    idRep: row.idRep,
    fleetUnitId,
    idMod,
    lifePercent,
    compLife,
    compCond: row.compCond ?? '',
    hmUnit,
    whDay: avgWhDay,
    woNo: row.woNo,
    woDate: toIsoDateOnly(row.woDate),
    woStatus: row.woStatus,
    woEndDate: toIsoDateOnly(row.woEndDate),
    compHour: row.compHour,
    lastHmRep: row.lastHmRep != null ? Number(row.lastHmRep) : null,
    lastRepDate: toIsoDateOnly(row.lastRepDate),
    nextReplacementDate: isOpen ? nextReplacementDate : null,
    rulEstimate,
    mrNo: row.mrNo,
    prNo: row.prNo,
    poNo: row.poNo,
    report: row.report,
    remarks: row.remarks,
    linkedForecast: mapReplacementLinkedForecast(row.forecast)
  }
}

export async function getReplacementComponentDetail(
  session: Session,
  fleetUnitId: number,
  idMod: number,
  query: DetailQuery
): Promise<ReplacementComponentDetailResult | null> {
  const unit = await getCachedUnit(fleetUnitId)
  if (!unit || !canAccessProject(session, unit.project_code)) {
    return null
  }

  const commod = await prisma.commod.findFirst({
    where: { idMod, fleetModelId: unit.model_id },
    include: { comp: true }
  })

  if (!commod) {
    return null
  }

  const page = Number.isFinite(query.page) && query.page >= 0 ? Math.floor(query.page) : 0
  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.floor(query.pageSize), 100) : 25

  const where = {
    fleetUnitId,
    idMod,
    deletedAt: null,
    ...getPrismaProjectFilter(session)
  }

  const [total, replacements, avgWhDay, latestHm, hmReadingsForRul] = await Promise.all([
    prisma.replacement.count({ where }),
    prisma.replacement.findMany({
      where,
      include: replacementInclude,
      orderBy: [{ idRep: 'desc' }]
    }),
    getUnitAvgWhDay(fleetUnitId),
    prisma.hm.findFirst({
      where: { fleetUnitId, deletedAt: null },
      orderBy: [{ idHm: 'desc' }]
    }),
    getUnitHmReadingsForRul(fleetUnitId)
  ])

  const latestHmUnit = latestHm ? Number(latestHm.hmUnit) : 0
  const latestReplacement = replacements[0] ?? null
  const displayRows = replacements.map(row =>
    buildDisplayRow(row, avgWhDay, latestHmUnit, fleetUnitId, idMod, hmReadingsForRul)
  )
  const rows = displayRows.slice(page * pageSize, page * pageSize + pageSize)

  return {
    unit: {
      fleetUnitId,
      unitNo: unit.unit_no,
      description: unit.description,
      projectCode: unit.project_code,
      model: unit.model,
      modelId: unit.model_id
    },
    component: {
      idMod: commod.idMod,
      compDesc: commod.comp.compDesc,
      compType: commod.comp.compType ?? commod.lifeType ?? null,
      policy: commod.policy,
      price: commod.price
    },
    avgWhDay,
    latestHmUnit: latestHm ? latestHmUnit : null,
    latestHmDate: latestHm ? toIsoDateOnly(latestHm.dateHm) : null,
    total,
    rows,
    canAddReplacement: canAddReplacementForComponent(latestReplacement)
  }
}
