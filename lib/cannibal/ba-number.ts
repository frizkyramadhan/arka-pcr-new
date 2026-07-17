/**
 * Legacy Cannibal BA number — format migrated from sistem lama.
 *
 * Pola numerik (017C, 004W, 000H): `{YY}52{PPP}{SEQ}` — PPP = 3 digit awal project code.
 * Pola alfanumerik (APS): `{YY}52{CODE}{SEQ}` — CODE = project code penuh.
 */
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const CANNIBAL_BA_TYPE_CODE = '52'

type BaNumberClient = Prisma.TransactionClient | typeof prisma

/** Middle segment setelah YY — mis. `52017` untuk 017C, `52APS` untuk APS. */
export function projectKeyForBaNumber(projectCode: string): string {
  const trimmed = projectCode.trim().toUpperCase()
  const numericPrefix = trimmed.match(/^(\d{3})/)
  if (numericPrefix) return numericPrefix[1]

  return trimmed
}

export function buildBaNumberPrefix(projectCode: string, year = new Date().getFullYear()): string {
  const yy = String(year % 100).padStart(2, '0')
  return `${yy}${CANNIBAL_BA_TYPE_CODE}${projectKeyForBaNumber(projectCode)}`
}

/** Parse suffix urutan dari nomor legacy yang sudah ada. */
export function parseLegacyBaSequence(noBa: string, projectCode: string): number | null {
  const marker = `${CANNIBAL_BA_TYPE_CODE}${projectKeyForBaNumber(projectCode)}`
  const markerIndex = noBa.indexOf(marker)
  if (markerIndex !== 2) return null

  const suffix = noBa.slice(markerIndex + marker.length)
  const seq = Number(suffix)
  if (!Number.isFinite(seq) || seq < 0) return null

  return seq
}

export function formatLegacyBaNumber(projectCode: string, sequence: number, year = new Date().getFullYear()): string {
  if (!Number.isFinite(sequence) || sequence < 1) {
    throw new Error('BA sequence must be a positive integer')
  }

  return `${buildBaNumberPrefix(projectCode, year)}${sequence}`
}

function isLegacyBaNumber(noBa: string, projectCode: string): boolean {
  return parseLegacyBaSequence(noBa, projectCode) !== null
}

/** Nomor BA berikutnya — lanjut urutan legacy per project (reset YY tiap tahun kalender). */
export async function nextLegacyBaNumber(
  projectCode: string,
  client: BaNumberClient = prisma,
  year = new Date().getFullYear()
): Promise<string> {
  const yearPrefix = buildBaNumberPrefix(projectCode, year)

  const latestThisYear = await client.ba.findFirst({
    where: {
      projectCode,
      noBa: { startsWith: yearPrefix }
    },
    orderBy: { noBa: 'desc' },
    select: { noBa: true }
  })

  if (latestThisYear) {
    const suffix = latestThisYear.noBa.slice(yearPrefix.length)
    const nextSeq = (Number(suffix) || 0) + 1
    return `${yearPrefix}${nextSeq}`
  }

  const candidates = await client.ba.findMany({
    where: { projectCode },
    orderBy: { noBa: 'desc' },
    select: { noBa: true },
    take: 50
  })

  for (const row of candidates) {
    const seq = parseLegacyBaSequence(row.noBa, projectCode)
    if (seq !== null) {
      return formatLegacyBaNumber(projectCode, seq + 1, year)
    }
  }

  return formatLegacyBaNumber(projectCode, 1, year)
}

export function isLegacyBaNumberForProject(noBa: string, projectCode: string): boolean {
  return isLegacyBaNumber(noBa, projectCode)
}
