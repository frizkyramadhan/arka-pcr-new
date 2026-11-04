/**
 * MySQL DATETIME / Prisma wall-clock helpers.
 * Prisma exposes naive DATETIME as UTC components on Date / ...Z ISO strings.
 * Display and form fields must use those components — not browser local shift.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type WallClockParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Extract wall-clock parts from Prisma Date, ISO-Z, or YYYY-MM-DD[THH:mm:ss]. */
export function wallClockParts(value: unknown): WallClockParts | null {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
      hour: value.getUTCHours(),
      minute: value.getUTCMinutes(),
      second: value.getUTCSeconds()
    }
  }

  const text = String(value).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text)
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4] ?? 0),
      minute: Number(match[5] ?? 0),
      second: Number(match[6] ?? 0)
    }
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds()
  }
}

/** Serialize Prisma DATETIME for JSON without timezone shift (no Z). */
export function toWallClockIso(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null
  const parts = wallClockParts(date)
  if (!parts) return null

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
}

/** Display: 10 Jan 2025, 11:25 */
export function formatWallClockDateTime(value: unknown, empty = '—'): string {
  const parts = wallClockParts(value)
  if (!parts) return empty

  return `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year}, ${pad(parts.hour)}:${pad(parts.minute)}`
}

/** Display date only: 10 Jan 2025 */
export function formatWallClockDate(value: unknown, empty = '—'): string {
  const parts = wallClockParts(value)
  if (!parts) return empty

  return `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year}`
}

/** Form inputs: { date: YYYY-MM-DD, time: HH:mm } */
export function splitWallClock(value: unknown): { date: string; time: string } | null {
  const parts = wallClockParts(value)
  if (!parts) return null

  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`
  }
}
