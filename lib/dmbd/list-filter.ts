/**
 * Breakdown list filters that do not need the database.
 * BD date and finish date are inclusive local calendar days.
 */
import type { Prisma } from '@prisma/client'

export type BreakdownListFilter = {
  status?: string
  bdFrom?: string
  bdTo?: string
  finishFrom?: string
  finishTo?: string
  description?: string
}

/** YYYY-MM-DD that is a real calendar day. */
function calendarDay(value: string | undefined): string | null {
  const day = String(value ?? '').trim().slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const date = Number(match[3])
  const probe = new Date(year, month - 1, date)
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== date) return null

  return day
}

/** Local day bounds, matching the wall clock stored on started_at and finished_at. */
function dayBounds(from?: string, to?: string): { gte?: Date; lte?: Date } | null {
  const start = calendarDay(from)
  const end = calendarDay(to)
  if (!start && !end) return null

  return {
    ...(start ? { gte: new Date(`${start}T00:00:00`) } : {}),
    ...(end ? { lte: new Date(`${end}T23:59:59.999`) } : {})
  }
}

/** BD date, finish date, description, and open/closed. */
export function breakdownListFilter(query: BreakdownListFilter): Prisma.BreakdownWhereInput {
  const where: Prisma.BreakdownWhereInput = {}
  const started = dayBounds(query.bdFrom, query.bdTo)
  if (started) where.startedAt = started

  const finished = dayBounds(query.finishFrom, query.finishTo)
  if (query.status === 'open' && finished) {
    where.AND = [{ finishedAt: null }, { cancelledAt: null }, { finishedAt: finished }]
  } else if (query.status === 'open') {
    where.finishedAt = null
    where.cancelledAt = null
  } else if (query.status === 'cancelled') {
    where.cancelledAt = { not: null }
  } else if (finished || query.status === 'closed') {
    where.cancelledAt = null
    where.finishedAt = {
      ...(query.status === 'closed' ? { not: null } : {}),
      ...(finished ?? {})
    }
  }

  const description = query.description?.trim()
  if (description) where.problem = { contains: description }

  return where
}
