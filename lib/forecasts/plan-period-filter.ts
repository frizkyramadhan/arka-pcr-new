import type { Prisma } from '@prisma/client'

/**
 * Month filter for plan_period (@db.Date) — matches any day within YYYY-MM.
 * Accepts YYYY-MM (from month input) or YYYY-MM-DD (legacy / API).
 */
export function buildPlanPeriodMonthWhere(value: string): Prisma.DateTimeFilter | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const monthMatch = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(trimmed)
  if (!monthMatch) return undefined

  const year = Number(monthMatch[1])
  const month = Number(monthMatch[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return undefined

  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lte: new Date(Date.UTC(year, month, 0))
  }
}
