/**
 * Register number Breakdown — pola sama Maintenance Actual:
 * BD-{project}.{yymm}-{seq}, contoh BD-021C.2611-0001.
 * Period dari started_at (wall-clock DATETIME via UTC getters).
 */
import { Prisma } from '@prisma/client'

type BreakdownRegisterDb = {
  breakdown: {
    findMany: (args: {
      where: { registerNo: { startsWith: string } }
      select: { registerNo: true }
    }) => Promise<{ registerNo: string }[]>
  }
}

/** yymm dari BD date — Date wall-clock memakai getUTC*. */
export function breakdownRegisterPeriod(startedAt: Date): string {
  const yy = String(startedAt.getUTCFullYear()).slice(2)
  const mm = String(startedAt.getUTCMonth() + 1).padStart(2, '0')

  return `${yy}${mm}`
}

/** Nomor berikutnya untuk satu site + satu bulan BD. Seq dihitung dari angka, bukan urutan teks. */
export async function nextBreakdownRegisterNo(
  db: BreakdownRegisterDb,
  projectCode: string,
  startedAt: Date
): Promise<string> {
  const code = projectCode.trim()
  const period = breakdownRegisterPeriod(startedAt)
  const prefix = `BD-${code}.${period}-`

  const existing = await db.breakdown.findMany({
    where: { registerNo: { startsWith: prefix } },
    select: { registerNo: true }
  })

  const highest = existing.reduce((max, row) => {
    const seq = Number(row.registerNo.slice(prefix.length))

    return Number.isInteger(seq) && seq > max ? seq : max
  }, 0)

  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}

/** Pratinjau nomor di form; yang tersimpan saat create yang berlaku. */
export async function previewBreakdownRegisterNo(
  projectCode: string,
  startedAt: Date
): Promise<string | null> {
  const code = projectCode.trim()
  if (!code || Number.isNaN(startedAt.getTime())) return null

  const { prisma } = await import('@/lib/prisma')

  return nextBreakdownRegisterNo(prisma, code, startedAt)
}

/** Unique clash pada register_no (race create paralel). */
export function isBreakdownRegisterClash(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false

  return String(error.meta?.target ?? '').includes('register_no')
}
