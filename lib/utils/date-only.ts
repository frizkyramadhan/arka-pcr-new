/**
 * DATE-only dari MySQL/Prisma (@db.Date) — kalender lokal host/DB, bukan UTC slice.
 */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export function toIsoDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Display date: 01 Jan 2000 (report grids & Excel exports). */
export function formatDisplayDate(value: Date | string | null | undefined, empty = ''): string {
  const iso = toIsoDateOnly(value)
  if (!iso) return empty

  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return empty

  const [, year, month, day] = match

  return `${day} ${MONTHS_SHORT[Number(month) - 1]} ${year}`
}
