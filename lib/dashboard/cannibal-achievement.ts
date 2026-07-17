/**
 * Achievement Cannibal tahunan — Total / Close / Open / Ach%
 * per projectCode × bulan postingDate.
 * Close includes CLOSED/CLOSE and legacy OPEN with L1–L3 APPROVED.
 * CANCEL/CANCELLED excluded.
 */

import type { Session } from 'next-auth'

import {
  ACHIEVEMENT_MONTH_KEYS,
  type AchievementByProjectMonth,
  type AchievementMonthCell,
  type AchievementMonthKey,
  type AchievementProjectRow
} from '@/lib/dashboard/achievement'
import { isCancelledBaStatus, isEffectivelyClosedBa, postingYearRange } from '@/lib/dashboard/cannibal-status'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { getPrismaProjectFilter } from '@/lib/utils/project-scope'

function emptyCell(): AchievementMonthCell {
  return { total: 0, close: 0, open: 0, ach: null }
}

function finalizeCell(cell: AchievementMonthCell): AchievementMonthCell {
  const { total, close, open } = cell

  return {
    total,
    close,
    open,
    ach: total > 0 ? Math.round((close / total) * 100) : null
  }
}

function monthKeyFromDate(value: Date | string): AchievementMonthKey | null {
  const iso = toIsoDateOnly(value)
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
 * Aggregate cannibal BA achievement by project × posting month.
 */
export async function getCannibalAchievementByProjectMonth(
  session: Session,
  year?: number
): Promise<AchievementByProjectMonth> {
  const targetYear = year && !Number.isNaN(year) ? year : new Date().getFullYear()
  const projectFilter = getPrismaProjectFilter(session)

  const rows = await prisma.ba.findMany({
    where: {
      deletedAt: null,
      statusBa: { notIn: ['CANCELLED', 'CANCEL'] },
      postingDate: postingYearRange(targetYear),
      ...projectFilter
    },
    select: {
      projectCode: true,
      postingDate: true,
      statusBa: true,
      statusL1: true,
      statusL2: true,
      statusL3: true
    }
  })

  const projectMap = new Map<string, Record<AchievementMonthKey, AchievementMonthCell>>()
  const grand = buildEmptyMonths()
  const ytdRaw = emptyCell()

  for (const row of rows) {
    if (isCancelledBaStatus(row.statusBa)) continue
    if (!row.postingDate) continue

    const monthKey = monthKeyFromDate(row.postingDate)
    if (!monthKey) continue

    const code = row.projectCode?.trim() || '(blank)'

    let months = projectMap.get(code)
    if (!months) {
      months = buildEmptyMonths()
      projectMap.set(code, months)
    }

    const cell = months[monthKey]
    const gCell = grand[monthKey]
    const closed = isEffectivelyClosedBa(row)

    cell.total += 1
    gCell.total += 1
    ytdRaw.total += 1

    if (closed) {
      cell.close += 1
      gCell.close += 1
      ytdRaw.close += 1
    } else {
      cell.open += 1
      gCell.open += 1
      ytdRaw.open += 1
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
