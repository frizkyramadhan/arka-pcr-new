/**
 * Format tanggal tampilan — 01 Jan 1990 (selaras DATE MySQL / Prisma @db.Date).
 * DateTime BD memakai wall-clock (lihat lib/utils/wall-clock.ts) agar tidak geser timezone.
 */
import {
  formatWallClockDate,
  formatWallClockDateTime,
  splitWallClock,
  toWallClockIso,
  wallClockParts
} from '@/lib/utils/wall-clock'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export { formatWallClockDate, formatWallClockDateTime, splitWallClock, toWallClockIso, wallClockParts }

export const toIsoDateOnly = value => {
  if (value == null || value === '') return null

  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const parts = wallClockParts(value)
  if (parts) {
    const pad = n => String(n).padStart(2, '0')

    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const formatDisplayDate = (value, empty = '—') => {
  const iso = toIsoDateOnly(value)
  if (!iso) return empty

  const [, year, month, day] = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []

  return `${day} ${MONTHS[Number(month) - 1]} ${year}`
}

/** BD / activity stamp: 10 Jan 2025, 11:25 — sama dengan jam di MySQL DATETIME. */
export const formatDisplayDateTime = (value, empty = '—') => formatWallClockDateTime(value, empty)
