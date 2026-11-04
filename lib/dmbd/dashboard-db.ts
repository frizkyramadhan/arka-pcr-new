/**
 * Membaca unit dan seluruh breakdown pada site user, lalu menghitung dashboard DMBD.
 * Semua episode dibaca karena tanggal acuan bisa mundur dari hari ini.
 * MTTR, MTBF, dan PA memakai target KPI yang sama dengan dashboard maintenance.
 */
import type { Session } from 'next-auth'

import { buildDmbdDashboard, resolveDashboardPeriod, type DmbdEpisode, type DmbdHmReading, type DmbdReliability } from '@/lib/dmbd/dashboard'
import { kpiStatusColor, resolveKpiTarget, type KpiCode, type ResolvedKpiTarget } from '@/lib/fms/kpi-targets'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { resolveProjectFilter } from '@/lib/utils/project-scope'

const HM_LOOKBACK_DAYS = 62

function numberOrNull(value: { toString(): string } | null): number | null {
  if (value == null) return null
  const parsed = Number(value.toString())

  return Number.isFinite(parsed) ? parsed : null
}

export async function loadDmbdDashboard(
  session: Session,
  query: {
    projectCode?: string
    plant?: string
    category?: string
    status?: string
    date?: string
    period?: string
    mode?: string
  }
) {
  const where = resolveProjectFilter(session, query.projectCode)

  const [units, episodes] = await Promise.all([
    prisma.fleetUnitCache.findMany({
      where,
      select: {
        fleetUnitId: true,
        unitNo: true,
        modelName: true,
        projectCode: true,
        plantType: true,
        plantGroup: true,
        unitStatus: true
      }
    }),
    prisma.breakdown.findMany({
      where: { ...where, cancelledAt: null },
      include: {
        activities: {
          select: {
            startedAt: true,
            createdAt: true,
            positionStatus: true,
            breakdownCode: true,
            breakdownCodeName: true,
            details: true,
            technicianName: true
          }
        }
      }
    })
  ])

  const rows: DmbdEpisode[] = episodes.map(row => ({
    id: row.id,
    fleetUnitId: row.fleetUnitId,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    problem: row.problem,
    hourMeter: numberOrNull(row.hourMeter),
    componentName: row.componentName,
    componentCode: row.componentCode,
    mechanicLeaderName: row.mechanicLeaderName,
    preparedBy: row.preparedBy,
    activities: row.activities
  }))

  const now = new Date()
  const mode = query.mode === 'MTD' || query.mode === 'YTD' ? query.mode : null

  const periodStart = mode
    ? resolveDashboardPeriod(query.period, mode, now).periodStart
    : new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lookback = new Date(periodStart)
  lookback.setDate(lookback.getDate() - HM_LOOKBACK_DAYS)
  const unitIds = units.map(unit => unit.fleetUnitId)

  const hmRows = unitIds.length
    ? await prisma.hm.findMany({
        where: { fleetUnitId: { in: unitIds }, dateHm: { gte: lookback, lte: now } },
        select: { fleetUnitId: true, dateHm: true, hmUnit: true },
        orderBy: [{ dateHm: 'asc' }, { idHm: 'asc' }]
      })
    : []

  const readings = new Map<number, DmbdHmReading[]>()
  for (const row of hmRows) {
    const iso = toIsoDateOnly(row.dateHm)
    if (!iso) continue
    const list = readings.get(row.fleetUnitId) ?? []
    list.push({ iso, hm: Number(row.hmUnit) })
    readings.set(row.fleetUnitId, list)
  }

  const built = buildDmbdDashboard({
    units,
    episodes: rows,
    plant: query.plant,
    category: query.category,
    status: query.status,
    date: query.date,
    period: query.period,
    mode: query.mode,
    now,
    readings
  })

  const site = query.projectCode && query.projectCode !== '__NONE__' ? query.projectCode : null

  return { ...built, reliability: await reliabilityCards(built.reliability, site, new Date(built.asOf)) }
}

async function reliabilityCards(numbers: DmbdReliability, projectCode: string | null, periodEnd: Date) {
  const specs: { code: KpiCode; label: string; unit: '%' | 'hrs'; value: number | null; note: string | null; detail: string }[] = [
    {
      code: 'MTTR',
      label: 'MTTR',
      unit: 'hrs',
      value: numbers.mttr.value,
      note: numbers.mttr.count === 0 ? 'No breakdown closed in this period' : null,
      detail: `${numbers.mttr.count} closed breakdowns`
    },
    {
      code: 'MTBF',
      label: 'MTBF',
      unit: 'hrs',
      value: numbers.mtbf.value,
      note:
        numbers.mtbf.runHours <= 0
          ? 'No hour meter increase recorded in this period'
          : numbers.mtbf.failures === 0
            ? 'No breakdown in this period'
            : null,
      detail: `${Math.round(numbers.mtbf.runHours).toLocaleString('en-US')} operating hrs ÷ ${numbers.mtbf.failures} breakdowns`
    },
    {
      code: 'PA_AVAILABILITY',
      label: 'PA / Availability',
      unit: '%',
      value: numbers.pa.value,
      note: numbers.pa.units === 0 ? 'No active units for this site' : null,
      detail: `${numbers.pa.units} units, calendar ${numbers.pa.calendarHours.toLocaleString('en-US')} h, breakdown downtime ${numbers.pa.downtimeHours.toLocaleString('en-US')} h`
    }
  ]

  const targets = await Promise.all(
    specs.map(item => resolveKpiTarget(item.code, { projectId: projectCode, maintenanceTypeId: null, periodEnd }))
  )

  return {
    mttr: toReliabilityCard(specs[0], targets[0]),
    mtbf: toReliabilityCard(specs[1], targets[1]),
    pa: toReliabilityCard(specs[2], targets[2])
  }
}

function toReliabilityCard(
  item: { code: string; label: string; unit: '%' | 'hrs'; value: number | null; note: string | null; detail: string },
  target: ResolvedKpiTarget | null
) {
  const state = item.value == null ? 'no-data' : 'ready'

  return {
    code: item.code,
    label: item.label,
    value: state === 'ready' ? item.value : null,
    unit: item.unit,
    target,
    color: state === 'ready' ? kpiStatusColor(item.value, target) : null,
    state,
    note: item.note,
    detail: item.detail
  }
}
