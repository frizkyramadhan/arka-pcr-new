import type { Replacement } from '@prisma/client'

/** HM tampilan / posting untuk WO OPEN — dinamis dari HM unit kecuali sudah di-edit manual. */
export function resolveOpenHmRepDisplay(
  replacement: Pick<Replacement, 'woStatus' | 'hmRep' | 'hmRepManual'>,
  latestHmUnit: number | null | undefined
): number | null {
  if (replacement.woStatus !== 'OPEN') {
    return replacement.hmRep != null ? Number(replacement.hmRep) : null
  }

  if (replacement.hmRepManual) {
    return Number(replacement.hmRep)
  }

  if (latestHmUnit != null && Number.isFinite(latestHmUnit)) {
    return latestHmUnit
  }

  return replacement.hmRep != null ? Number(replacement.hmRep) : null
}

/** Anchor life calc OPEN — selalu last_hm_rep, bukan hm_rep. */
export function resolveLifeAnchorHm(replacement: Pick<Replacement, 'lastHmRep'>): number {
  return Number(replacement.lastHmRep ?? 0)
}
