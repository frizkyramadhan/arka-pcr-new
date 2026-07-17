/**
 * Life % / comp_life dari replacement terakhir — selaras OPEN (live) vs CLOSE (beku).
 */
import type { Replacement } from '@prisma/client'

import { calculateComponentLife } from '@/lib/calculations/life'
import { computeLiveLifeMetrics } from '@/lib/replacement/life-metrics'
import { prisma } from '@/lib/prisma'
import { getLatestReplacementForComponent } from '@/lib/replacement/cycle'

export type LatestReplacementLife = {
  hmNow: number
  currentLife: number
  lifePercent: number
  woStatus: string | null
}

/** HM unit terbaru + life metrics dari replacement terakhir per komponen. */
export async function resolveLatestReplacementLife(
  fleetUnitId: number,
  idMod: number,
  policy: number
): Promise<LatestReplacementLife> {
  const [latestHm, latestReplacement] = await Promise.all([
    prisma.hm.findFirst({
      where: { fleetUnitId, deletedAt: null },
      orderBy: { dateHm: 'desc' }
    }),
    getLatestReplacementForComponent(fleetUnitId, idMod)
  ])

  const hmNow = Number(latestHm?.hmUnit ?? 0)

  if (latestReplacement?.woStatus === 'OPEN') {
    const live = await computeLiveLifeMetrics(latestReplacement)

    return {
      hmNow,
      currentLife: live?.currentLife ?? 0,
      lifePercent: live?.lifePercent ?? 0,
      woStatus: 'OPEN'
    }
  }

  if (latestReplacement?.woStatus === 'CLOSE') {
    return {
      hmNow,
      currentLife: Number(latestReplacement.compLife),
      lifePercent: Number(latestReplacement.lifePercent),
      woStatus: 'CLOSE'
    }
  }

  const calc = calculateComponentLife({
    hmNow,
    hmLastReplacement: 0,
    compHour: 0,
    policy
  })

  return {
    hmNow,
    currentLife: calc.currentLife,
    lifePercent: calc.lifePercent,
    woStatus: null
  }
}

export async function resolveLatestReplacementLifePercent(
  replacement: Replacement
): Promise<number | null> {
  if (replacement.woStatus === 'OPEN') {
    const live = await computeLiveLifeMetrics(replacement)

    return live?.lifePercent ?? null
  }

  if (replacement.woStatus === 'CLOSE') {
    return replacement.lifePercent != null ? Number(replacement.lifePercent) : null
  }

  return null
}
