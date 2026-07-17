import type { Prisma, Replacement } from '@prisma/client'

import { prisma } from '@/lib/prisma'

/**
 * Legacy: satu WO OPEN aktif per component — Add hanya jika belum ada riwayat atau WO terakhir CLOSE.
 */
export function canAddReplacementForComponent(
  latest: Pick<Replacement, 'woStatus'> | null | undefined
): boolean {
  if (!latest) return true

  return latest.woStatus === 'CLOSE'
}

export async function getLatestReplacementForComponent(
  fleetUnitId: number,
  idMod: number,
  extraWhere: Prisma.ReplacementWhereInput = {}
) {
  return prisma.replacement.findFirst({
    where: {
      fleetUnitId,
      idMod,
      deletedAt: null,
      ...extraWhere
    },
    orderBy: { idRep: 'desc' }
  })
}

/** comp_type MAJOR — wajib ada installation report sebelum close (legacy). */
export function isMajorComponent(compType: string | null | undefined): boolean {
  return compType?.toUpperCase() === 'MAJOR'
}
