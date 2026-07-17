/**
 * BA PCR document number:
 * {sequenceNo}/PLT-{projectCode}/PCR/{romanMonth}/{year}
 *
 * Sequence is per site (projectCode), reset each calendar year.
 */
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const

type BaPcrNumberClient = Prisma.TransactionClient | typeof prisma

export function romanMonthFromDate(date: Date): string {
  return ROMAN_MONTHS[date.getMonth()] ?? 'I'
}

export function formatBaPcrNumber(sequence: number, projectCode: string, date: Date): string {
  const year = date.getFullYear()
  const roman = romanMonthFromDate(date)
  const seq = String(sequence).padStart(3, '0')

  return `${seq}/PLT-${projectCode}/PCR/${roman}/${year}`
}

export function parseBaPcrSequence(noBaPcr: string): number | null {
  const seqPart = noBaPcr.split('/')[0]
  const n = Number.parseInt(seqPart, 10)

  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseBaPcrYear(noBaPcr: string): number | null {
  const parts = noBaPcr.split('/')
  const year = Number.parseInt(parts[parts.length - 1] ?? '', 10)

  return Number.isFinite(year) ? year : null
}

export function isBaPcrNumberForSiteYear(noBaPcr: string, projectCode: string, year: number): boolean {
  return noBaPcr.includes(`/PLT-${projectCode}/PCR/`) && noBaPcr.endsWith(`/${year}`)
}

/** Highest sequence used for a site in a calendar year (0 if none). */
export async function maxBaPcrSequenceForSiteYear(
  client: BaPcrNumberClient,
  projectCode: string,
  year: number
): Promise<number> {
  const existing = await client.baPcr.findMany({
    where: { noBaPcr: { not: null } },
    select: { noBaPcr: true }
  })

  let max = 0
  for (const row of existing) {
    if (!row.noBaPcr || !isBaPcrNumberForSiteYear(row.noBaPcr, projectCode, year)) continue
    const n = parseBaPcrSequence(row.noBaPcr)
    if (n !== null && n > max) max = n
  }

  return max
}

/** Next sequence for site + calendar year (within transaction). */
export async function nextBaPcrSequence(
  tx: Prisma.TransactionClient,
  projectCode: string,
  date: Date
): Promise<number> {
  const max = await maxBaPcrSequenceForSiteYear(tx, projectCode, date.getFullYear())

  return max + 1
}

export async function isBaPcrSequenceUsedInYear(
  client: BaPcrNumberClient,
  projectCode: string,
  year: number,
  sequence: number
): Promise<boolean> {
  const existing = await client.baPcr.findMany({
    where: { noBaPcr: { not: null } },
    select: { noBaPcr: true }
  })

  for (const row of existing) {
    if (!row.noBaPcr || !isBaPcrNumberForSiteYear(row.noBaPcr, projectCode, year)) continue
    if (parseBaPcrSequence(row.noBaPcr) === sequence) return true
  }

  return false
}

export async function assertBaPcrSequenceAvailable(
  tx: Prisma.TransactionClient,
  projectCode: string,
  date: Date,
  sequence: number
): Promise<string> {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Nomor urut BA PCR harus bilangan bulat positif')
  }

  const year = date.getFullYear()
  const noBaPcr = formatBaPcrNumber(sequence, projectCode, date)

  const duplicateNumber = await tx.baPcr.findFirst({ where: { noBaPcr } })
  if (duplicateNumber) {
    throw new Error(`Nomor BA PCR ${noBaPcr} sudah digunakan`)
  }

  const duplicateSequence = await isBaPcrSequenceUsedInYear(tx, projectCode, year, sequence)
  if (duplicateSequence) {
    throw new Error(
      `Nomor urut ${String(sequence).padStart(3, '0')} sudah dipakai untuk site ${projectCode} pada tahun ${year}`
    )
  }

  return noBaPcr
}

export function isCbmCriticalForForecast(
  condition: {
    condition: string
    sosRating?: string | null
    fcRating?: string | null
    mpsRating?: string | null
    viRating?: string | null
    ta2Rating?: string | null
    edRating?: string | null
  } | null
): boolean {
  if (!condition) return false

  if (condition.condition === 'CRITICAL') return true

  const ratings = [
    condition.sosRating,
    condition.fcRating,
    condition.mpsRating,
    condition.viRating,
    condition.ta2Rating,
    condition.edRating
  ]

  return ratings.some(r => r?.trim().toUpperCase() === 'X')
}
