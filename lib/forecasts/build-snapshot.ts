import { prisma } from '@/lib/prisma'
import { resolveLatestReplacementLife } from '@/lib/replacement/latest-life'
import { getLatestReplacementForComponent } from '@/lib/replacement/cycle'

export type ForecastSnapshot = {
  modelName: string | null
  unitNo: string
  projectCode: string
  compDesc: string
  hmComponent: number
  policy: number | null
  lifePercent: number
  ratingSos: string | null
  ratingCbm: string | null
  priceComponent: number | null
  snapshotAt: Date
  baselineIdRep: number | null
}

/** Snapshot forecast — life % selaras dengan replacement terakhir (OPEN = live, CLOSE = beku). */
export async function buildForecastSnapshot(
  fleetUnitId: number,
  idMod: number
): Promise<ForecastSnapshot> {
  const [equipment, commod, condition, latestSos] = await Promise.all([
    prisma.fleetUnitCache.findUniqueOrThrow({ where: { fleetUnitId } }),
    prisma.commod.findUniqueOrThrow({ where: { idMod }, include: { comp: true } }),
    prisma.condition.findFirst({
      where: { fleetUnitId, idMod, deletedAt: null }
    }),
    prisma.sos.findFirst({
      where: { fleetUnitId, idMod, deletedAt: null },
      orderBy: { sampleDate: 'desc' }
    })
  ])

  const policy = commod.policy ?? 1
  const life = await resolveLatestReplacementLife(fleetUnitId, idMod, policy)
  const latestReplacement = await getLatestReplacementForComponent(fleetUnitId, idMod)
  const ratingSos = condition?.sosRating ?? latestSos?.evalCode?.slice(0, 1) ?? null

  return {
    modelName: equipment.modelName,
    unitNo: equipment.unitNo,
    projectCode: equipment.projectCode,
    compDesc: commod.comp.compDesc,
    hmComponent: life.currentLife,
    policy: commod.policy,
    lifePercent: life.lifePercent,
    ratingSos,
    ratingCbm: condition?.condition ?? null,
    priceComponent: commod.price ? Number(commod.price) : null,
    snapshotAt: new Date(),
    baselineIdRep: latestReplacement?.idRep ?? null
  }
}
