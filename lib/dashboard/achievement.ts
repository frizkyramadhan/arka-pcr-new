/**
 * Achievement PCR tahunan — agregasi Total / Close / Open / Ach%
 * per projectCode × bulan planPeriod (dari pcr_forecast).
 */

import type { Session } from 'next-auth'

import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { getPrismaProjectFilter } from '@/lib/utils/project-scope'

export const ACHIEVEMENT_MONTH_KEYS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const

export type AchievementMonthKey = (typeof ACHIEVEMENT_MONTH_KEYS)[number]

export type AchievementMonthCell = {
  total: number
  close: number
  open: number
  /** null when total = 0 (no indicator in UI) */
  ach: number | null
}

export type AchievementProjectRow = {
  projectCode: string
  months: Record<AchievementMonthKey, AchievementMonthCell>
}

export type AchievementByProjectMonth = {
  year: number
  months: AchievementMonthKey[]
  projects: AchievementProjectRow[]
  grandTotal: Record<AchievementMonthKey, AchievementMonthCell>
  ytd: AchievementMonthCell
}

function emptyCell(): AchievementMonthCell {
  return { total: 0, close: 0, open: 0, ach: null }
}

function finalizeCell(cell: AchievementMonthCell): AchievementMonthCell {
  const total = cell.total
  const close = cell.close
  const open = cell.open

  return {
    total,
    close,
    open,
    ach: total > 0 ? Math.round((close / total) * 100) : null
  }
}

function monthKeyFromPlanPeriod(planPeriod: Date | string): AchievementMonthKey | null {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso) return null

  const monthIndex = Number(iso.slice(5, 7)) - 1
  if (monthIndex < 0 || monthIndex > 11) return null

  return ACHIEVEMENT_MONTH_KEYS[monthIndex]
}

function buildEmptyMonths(): Record<AchievementMonthKey, AchievementMonthCell> {
  return Object.fromEntries(ACHIEVEMENT_MONTH_KEYS.map(key => [key, emptyCell()])) as Record<
    AchievementMonthKey,
    AchievementMonthCell
  >
}

/**
 * Aggregate PCR forecast achievement by project × calendar month for a year.
 * Ach% = Close / Total; Grand Total Ach is weighted ΣClose / ΣTotal.
 */
export async function getAchievementByProjectMonth(
  session: Session,
  year?: number
): Promise<AchievementByProjectMonth> {
  const targetYear = year && !Number.isNaN(year) ? year : new Date().getFullYear()
  const projectFilter = getPrismaProjectFilter(session)

  const grouped = await prisma.pcrForecast.groupBy({
    by: ['projectCode', 'planPeriod', 'forecastStatus'],
    where: {
      deletedAt: null,
      planPeriod: {
        gte: new Date(`${targetYear}-01-01`),
        lte: new Date(`${targetYear}-12-31`)
      },
      ...projectFilter
    },
    _count: { _all: true },
    orderBy: [{ projectCode: 'asc' }, { planPeriod: 'asc' }]
  })

  const projectMap = new Map<string, Record<AchievementMonthKey, AchievementMonthCell>>()
  const grand = buildEmptyMonths()
  const ytdRaw = emptyCell()

  for (const row of grouped) {
    const monthKey = monthKeyFromPlanPeriod(row.planPeriod)
    if (!monthKey) continue

    const count = row._count._all
    const code = row.projectCode?.trim() || '(blank)'

    let months = projectMap.get(code)
    if (!months) {
      months = buildEmptyMonths()
      projectMap.set(code, months)
    }

    const cell = months[monthKey]
    const gCell = grand[monthKey]

    cell.total += count
    gCell.total += count
    ytdRaw.total += count

    if (row.forecastStatus === 'CLOSED') {
      cell.close += count
      gCell.close += count
      ytdRaw.close += count
    } else {
      cell.open += count
      gCell.open += count
      ytdRaw.open += count
    }
  }

  const projects: AchievementProjectRow[] = [...projectMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([projectCode, months]) => ({
      projectCode,
      months: Object.fromEntries(
        ACHIEVEMENT_MONTH_KEYS.map(key => [key, finalizeCell(months[key])])
      ) as Record<AchievementMonthKey, AchievementMonthCell>
    }))

  const grandTotal = Object.fromEntries(
    ACHIEVEMENT_MONTH_KEYS.map(key => [key, finalizeCell(grand[key])])
  ) as Record<AchievementMonthKey, AchievementMonthCell>

  return {
    year: targetYear,
    months: [...ACHIEVEMENT_MONTH_KEYS],
    projects,
    grandTotal,
    ytd: finalizeCell(ytdRaw)
  }
}
