/**
 * Resolve id_rep saat create/refresh forecast — kolom unik; baris soft-deleted tidak boleh memblokir link WO.
 */
import { prisma } from '@/lib/prisma'

/**
 * Kembalikan baselineIdRep bila belum dipakai forecast aktif.
 * Bila hanya dipakai forecast soft-deleted, kosongkan id_rep baris itu lalu kembalikan baseline.
 * Bila dipakai forecast non-deleted lain, kembalikan null (mis. forecast CLOSED masih pegang link).
 */
export async function resolveLinkableIdRep(
  baselineIdRep: number | null | undefined,
  excludeForecastId?: number
): Promise<number | null> {
  if (baselineIdRep == null) return null

  const existing = await prisma.pcrForecast.findFirst({
    where: {
      idRep: baselineIdRep,
      ...(excludeForecastId ? { NOT: { idForecast: excludeForecastId } } : {})
    },
    select: { idForecast: true, deletedAt: true }
  })

  if (!existing) return baselineIdRep

  if (existing.deletedAt) {
    await prisma.pcrForecast.update({
      where: { idForecast: existing.idForecast },
      data: { idRep: null }
    })

    return baselineIdRep
  }

  return null
}
