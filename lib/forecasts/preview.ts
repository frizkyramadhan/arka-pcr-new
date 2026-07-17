/**
 * Preview data komponen untuk form create forecast — replacement, SOS, harga, life %.
 */
import type { Session } from 'next-auth'

import { getCachedUnit } from '@/lib/fleet-api/db-cache'
import { buildForecastSnapshot } from '@/lib/forecasts/build-snapshot'
import { prisma } from '@/lib/prisma'
import { resolveLatestReplacementLifePercent } from '@/lib/replacement/latest-life'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { canAccessProject } from '@/lib/utils/project-scope'

export type ForecastComponentPreview = {
  component: {
    compDesc: string
    compType: string | null
    policy: number | null
    price: number | null
  }
  snapshot: {
    hmComponent: number
    lifePercent: number
    ratingSos: string | null
  }
  latestReplacement: {
    idRep: number
    repDate: string | null
    hmRep: number | null
    woStatus: string
    woEndDate: string | null
    lifePercent: number | null
    compCond: string | null
  } | null
  latestSos: {
    sampleDate: string | null
    evalCode: string | null
    labNo: string | null
  } | null
}

export async function getForecastComponentPreview(
  session: Session,
  fleetUnitId: number,
  idMod: number
): Promise<ForecastComponentPreview | null> {
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

  const [snapshot, latestReplacement, latestSos] = await Promise.all([
    buildForecastSnapshot(fleetUnitId, idMod),
    prisma.replacement.findFirst({
      where: { fleetUnitId, idMod, deletedAt: null },
      orderBy: { idRep: 'desc' }
    }),
    prisma.sos.findFirst({
      where: { fleetUnitId, idMod, deletedAt: null },
      orderBy: { sampleDate: 'desc' }
    })
  ])

  const latestReplacementLifePercent = latestReplacement
    ? await resolveLatestReplacementLifePercent(latestReplacement)
    : null

  return {
    component: {
      compDesc: commod.comp.compDesc,
      compType: commod.comp.compType ?? commod.lifeType ?? null,
      policy: commod.policy,
      price: commod.price ? Number(commod.price) : null
    },
    snapshot: {
      hmComponent: snapshot.hmComponent,
      lifePercent: snapshot.lifePercent,
      ratingSos: snapshot.ratingSos
    },
    latestReplacement: latestReplacement
      ? {
          idRep: latestReplacement.idRep,
          repDate: toIsoDateOnly(latestReplacement.repDate),
          hmRep: latestReplacement.hmRep != null ? Number(latestReplacement.hmRep) : null,
          woStatus: latestReplacement.woStatus,
          woEndDate: toIsoDateOnly(latestReplacement.woEndDate),
          lifePercent: latestReplacementLifePercent,
          compCond: latestReplacement.compCond
        }
      : null,
    latestSos: latestSos
      ? {
          sampleDate: toIsoDateOnly(latestSos.sampleDate),
          evalCode: latestSos.evalCode,
          labNo: latestSos.labNo
        }
      : null
  }
}
