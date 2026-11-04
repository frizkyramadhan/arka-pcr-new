/**
 * Breakdown report board: ACTIVE ARKFleet units in the chosen project.
 * Open breakdown fills the BD columns. RFU units stay on the board without BD detail.
 */
import type { Session } from 'next-auth'

import { isOpenBdPositionEpisode, latestActivity } from '@/lib/dmbd/breakdowns'
import type { BreakdownReportSource } from '@/lib/dmbd/report-layout'
import { matchesUnitStatus } from '@/lib/fleet-api/unit-status'
import { prisma } from '@/lib/prisma'
import { resolveProjectFilter } from '@/lib/utils/project-scope'
import { toWallClockIso } from '@/lib/utils/wall-clock'

function numberOrNull(value: { toString(): string } | null): number | null {
  if (value == null) return null
  const parsed = Number(value.toString())

  return Number.isFinite(parsed) ? parsed : null
}

export type BreakdownBoardQuery = {
  projectCode?: string
  fleetUnitId?: string

  /** rfu | bd | empty for all */
  status?: string
  q?: string
  plantGroup?: string

  /** ARKFleet plant_type (DMBD "Plant"). */
  plantType?: string
}

function dateOnlyIso(value: Date | null | undefined): string | null {
  if (!value) return null

  // DATE / DATETIME wall-clock — UTC getters match stored calendar day.
  const iso = toWallClockIso(value)

  return iso ? iso.slice(0, 10) : null
}

/** One row per fleet unit in scope. BD detail only when an open breakdown exists. */
export async function listBreakdownBoard(
  session: Session,
  query: BreakdownBoardQuery
): Promise<BreakdownReportSource[]> {
  const projectCode = (query.projectCode || '').trim()
  if (!projectCode) return []

  const where = resolveProjectFilter(session, projectCode)
  if (where.projectCode === '__NONE__') return []

  const unitId = Number(query.fleetUnitId)

  const unitWhere = {
    ...where,
    ...(Number.isInteger(unitId) && unitId > 0 ? { fleetUnitId: unitId } : {})
  }

  const [unitRows, openRows] = await Promise.all([
    prisma.fleetUnitCache.findMany({
      where: unitWhere,
      select: {
        fleetUnitId: true,
        unitNo: true,
        modelName: true,
        projectCode: true,
        plantGroup: true,
        plantType: true,
        unitStatus: true
      },
      orderBy: [{ plantGroup: 'asc' }, { unitNo: 'asc' }]
    }),
    prisma.breakdown.findMany({
      where: { ...unitWhere, finishedAt: null, cancelledAt: null },
      include: {
        activities: {
          select: {
            startedAt: true,
            createdAt: true,
            positionStatus: true,
            breakdownCode: true,
            breakdownCodeName: true
          }
        }
      }
    })
  ])

  // Same ACTIVE rule as the units list / ARKFleet status filter.
  const units = unitRows.filter(unit => matchesUnitStatus(unit.unitStatus ?? '', 'ACTIVE'))
  const activeIds = new Set(units.map(unit => unit.fleetUnitId))

  // Summary board BD columns only from an open BD-position episode; open AJ stays off the board.
  const openByUnit = new Map<number, (typeof openRows)[number]>()
  for (const row of openRows) {
    if (!activeIds.has(row.fleetUnitId)) continue
    if (!isOpenBdPositionEpisode(row.activities)) continue
    const current = openByUnit.get(row.fleetUnitId)
    if (!current || row.startedAt > current.startedAt) openByUnit.set(row.fleetUnitId, row)
  }

  const activeIdList = [...activeIds]

  const hmRows = activeIdList.length
    ? await prisma.hm.findMany({
        where: { fleetUnitId: { in: activeIdList }, deletedAt: null },
        select: { fleetUnitId: true, hmUnit: true, dateHm: true, idHm: true },
        orderBy: [{ dateHm: 'desc' }, { idHm: 'desc' }]
      })
    : []
  const latestHmByUnit = new Map<number, number>()
  for (const row of hmRows) {
    if (latestHmByUnit.has(row.fleetUnitId)) continue
    const hm = numberOrNull(row.hmUnit)
    if (hm != null) latestHmByUnit.set(row.fleetUnitId, hm)
  }

  const search = (query.q || '').trim().toLowerCase()
  const status = (query.status || '').trim().toLowerCase()
  const plantGroup = (query.plantGroup || '').trim()
  const plantType = (query.plantType || '').trim()

  const rows: BreakdownReportSource[] = []
  for (const unit of units) {
    if (plantGroup && (unit.plantGroup || '').trim() !== plantGroup) continue
    if (plantType && (unit.plantType || '').trim() !== plantType) continue

    const open = openByUnit.get(unit.fleetUnitId)
    if (status === 'rfu' && open) continue
    if (status === 'bd' && !open) continue

    if (search) {
      const hay = [unit.unitNo, unit.modelName, unit.plantGroup, open?.problem, open?.workOrder]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(search)) continue
    }

    const latestHm = latestHmByUnit.get(unit.fleetUnitId) ?? null

    if (!open) {
      rows.push({
        id: `ready-${unit.fleetUnitId}`,
        fleetUnitId: unit.fleetUnitId,
        unitNo: unit.unitNo,
        modelName: unit.modelName,
        projectCode: unit.projectCode,
        plantGroup: unit.plantGroup,
        plantType: unit.plantType,
        startedAt: '',
        finishedAt: null,
        problem: '',
        hourMeter: null,
        hmUpdate: latestHm,
        statusUnit: 'RFU',
        workOrder: null,
        remark: null,
        latestCode: null,
        latestCodeName: null
      })
      continue
    }

    const latest = latestActivity(open.activities)
    rows.push({
      id: open.id,
      fleetUnitId: unit.fleetUnitId,
      unitNo: unit.unitNo,
      modelName: unit.modelName,
      projectCode: unit.projectCode,
      plantGroup: unit.plantGroup,
      plantType: unit.plantType,
      startedAt: toWallClockIso(open.startedAt) ?? '',
      finishedAt: null,
      problem: open.problem,
      hourMeter: numberOrNull(open.hourMeter),
      hmUpdate: latestHm,
      etaRfuDate: dateOnlyIso(open.etaRfuDate),
      etaRfuIfPart: (() => {
        if (open.etaRfuIfPart == null) return null
        const days = Number(open.etaRfuIfPart)

        return Number.isFinite(days) ? days : null
      })(),
      statusUnit: latest?.positionStatus || 'BD',
      workOrder: open.workOrder,
      remark: open.remark,
      latestCode: latest?.breakdownCode ?? null,
      latestCodeName: latest?.breakdownCodeName ?? null
    })
  }

  return rows
}

/** Save ETA fields on an open breakdown from the Summary Breakdown board. */
export async function updateBreakdownEta(
  breakdownId: string,
  input: { etaRfuDate?: string | null; etaRfuIfPart?: number | string | null },
  canAccess: (projectCode: string) => boolean
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const row = await prisma.breakdown.findUnique({
    where: { id: breakdownId },
    select: { id: true, projectCode: true, finishedAt: true, cancelledAt: true }
  })
  if (!row) return { ok: false, status: 404, error: 'Breakdown was not found' }
  if (!canAccess(row.projectCode)) return { ok: false, status: 403, error: 'You cannot change this breakdown' }
  if (row.finishedAt) return { ok: false, status: 409, error: 'This breakdown is already closed' }
  if (row.cancelledAt) return { ok: false, status: 409, error: 'Cancelled breakdowns cannot be changed' }

  const data: { etaRfuDate?: Date | null; etaRfuIfPart?: number | null } = {}
  if ('etaRfuDate' in input) {
    const raw = String(input.etaRfuDate ?? '').trim()
    if (!raw) data.etaRfuDate = null
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ok: false, status: 400, error: 'ETA RFU date is invalid' }
    else data.etaRfuDate = new Date(`${raw}T00:00:00`)
  }
  if ('etaRfuIfPart' in input) {
    const raw = input.etaRfuIfPart
    if (raw == null || String(raw).trim() === '') data.etaRfuIfPart = null
    else {
      const days = Number(raw)
      if (!Number.isInteger(days) || days < 0 || days > 9999) {
        return { ok: false, status: 400, error: 'ETA RFU IF PART SUPPLIED must be a whole number of days' }
      }
      data.etaRfuIfPart = days
    }
  }
  if (!Object.keys(data).length) return { ok: false, status: 400, error: 'No ETA fields to update' }

  await prisma.breakdown.update({ where: { id: row.id }, data })

  return { ok: true }
}
