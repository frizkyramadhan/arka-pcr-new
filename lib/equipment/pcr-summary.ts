import type { UnitSummaryResponse } from '@/types/equipment'

import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'

type CountMap = Map<number, number>

function toCountMap(rows: Array<{ idMod: number; _count: { _all: number } }>): CountMap {
  return new Map(rows.map(row => [row.idMod, row._count._all]))
}

export async function getUnitPcrSummary(
  fleetUnitId: number,
  fleetModelId: number
): Promise<UnitSummaryResponse> {
  const commods = await prisma.commod.findMany({
    where: { fleetModelId },
    include: { comp: true },
    orderBy: { comp: { compDesc: 'asc' } }
  })

  const [
    unitHmCount,
    replacementCounts,
    sosCounts,
    inspectionCounts,
    conditionCounts,
    conditions,
    latestInspectionDates,
    latestSosDates
  ] = await Promise.all([
    prisma.hm.count({ where: { fleetUnitId, deletedAt: null } }),
    prisma.replacement.groupBy({
      by: ['idMod'],
      where: { fleetUnitId, deletedAt: null },
      _count: { _all: true }
    }),
    prisma.sos.groupBy({
      by: ['idMod'],
      where: { fleetUnitId, deletedAt: null },
      _count: { _all: true }
    }),
    prisma.inspection.groupBy({
      by: ['idMod'],
      where: { fleetUnitId, deletedAt: null },
      _count: { _all: true }
    }),
    prisma.condition.groupBy({
      by: ['idMod'],
      where: { fleetUnitId, deletedAt: null },
      _count: { _all: true }
    }),
    prisma.condition.findMany({
      where: { fleetUnitId, deletedAt: null }
    }),
    prisma.inspection.groupBy({
      by: ['idMod'],
      where: { fleetUnitId, deletedAt: null },
      _max: { insDate: true }
    }),
    prisma.sos.groupBy({
      by: ['idMod'],
      where: { fleetUnitId, deletedAt: null },
      _max: { sampleDate: true }
    })
  ])

  const replacementMap = toCountMap(replacementCounts)
  const sosMap = toCountMap(sosCounts)
  const inspectionMap = toCountMap(inspectionCounts)
  const conditionMap = toCountMap(conditionCounts)
  const conditionByMod = new Map(conditions.map(row => [row.idMod, row]))

  const lastInspectionByMod = new Map(
    latestInspectionDates.map(row => [row.idMod, toIsoDateOnly(row._max.insDate)])
  )
  const lastSosByMod = new Map(latestSosDates.map(row => [row.idMod, toIsoDateOnly(row._max.sampleDate)]))

  const components = commods.map(commod => {
    const replacementCount = replacementMap.get(commod.idMod) ?? 0
    const sosCount = sosMap.get(commod.idMod) ?? 0
    const inspectionCount = inspectionMap.get(commod.idMod) ?? 0
    const conditionCount = conditionMap.get(commod.idMod) ?? 0
    const hasPcrData = replacementCount + sosCount + inspectionCount + conditionCount > 0
    const conditionRow = conditionByMod.get(commod.idMod)

    return {
      idMod: commod.idMod,
      idComp: commod.idComp,
      compDesc: commod.comp.compDesc,
      compType: commod.comp.compType,
      policy: commod.policy,
      replacementCount,
      sosCount,
      inspectionCount,
      conditionCount,
      hasPcrData,
      condition: conditionRow?.condition ?? null,
      sosRating: conditionRow?.sosRating ?? null,
      fcRating: conditionRow?.fcRating ?? null,
      mpsRating: conditionRow?.mpsRating ?? null,
      viRating: conditionRow?.viRating ?? null,
      ta2Rating: conditionRow?.ta2Rating ?? null,
      edRating: conditionRow?.edRating ?? null,
      lastInspectionDate: lastInspectionByMod.get(commod.idMod) ?? null,
      lastSosDate: lastSosByMod.get(commod.idMod) ?? null
    }
  })

  return {
    fleetUnitId,
    fleetModelId,
    unitHmCount,
    components,
    totals: {
      policies: components.length,
      withPcrData: components.filter(item => item.hasPcrData).length
    }
  }
}

// Backward compatibility for existing imports during transition.
export const getEquipmentPcrSummary = getUnitPcrSummary
