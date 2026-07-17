import type { Replacement } from '@prisma/client'

import { calculateComponentLife } from '@/lib/calculations/life'
import { resolveLifeAnchorHm } from '@/lib/replacement/hm-rep'
import { prisma } from '@/lib/prisma'

export type LiveLifeMetrics = {
  hmNow: number
  currentLife: number
  lifePercent: number
  remainingHours: number
  isCritical: boolean
  isOverdue: boolean
  policy: number | null
}

export async function computeLiveLifeMetrics(replacement: Replacement): Promise<LiveLifeMetrics | null> {
  if (replacement.woStatus !== 'OPEN') return null

  const [latestHm, commod] = await Promise.all([
    prisma.hm.findFirst({
      where: { fleetUnitId: replacement.fleetUnitId, deletedAt: null },
      orderBy: { dateHm: 'desc' }
    }),
    prisma.commod.findUnique({ where: { idMod: replacement.idMod } })
  ])

  if (!commod) return null

  const hmNow = Number(latestHm?.hmUnit ?? 0)

  const calc = calculateComponentLife({
    hmNow,
    hmLastReplacement: resolveLifeAnchorHm(replacement),
    compHour: replacement.compHour ?? 0,
    policy: commod.policy ?? 1
  })

  return {
    hmNow,
    currentLife: calc.currentLife,
    lifePercent: calc.lifePercent,
    remainingHours: calc.remainingHours,
    isCritical: calc.isCritical,
    isOverdue: calc.isOverdue,
    policy: commod.policy
  }
}

export async function enrichReplacementsWithLiveMetrics<T extends Replacement>(
  rows: T[]
): Promise<Array<T & { liveMetrics: LiveLifeMetrics | null }>> {
  return Promise.all(
    rows.map(async row => ({
      ...row,
      liveMetrics: await computeLiveLifeMetrics(row)
    }))
  )
}
