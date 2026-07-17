/**
 * DATE-only dari MySQL/Prisma (@db.Date) — kalender lokal host/DB, bukan UTC slice.
 */
export function toIsoDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
