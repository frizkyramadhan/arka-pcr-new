/**
 * Build per-site maintenance ACH digest (MTD + YTD) for email template / preview.
 * Reuses getFmsAchievement — no SMTP send here.
 */
import { getFmsAchievement } from '@/lib/fms/dashboard/achievement'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des'
]

export type AchTriplet = {
  plan: number
  actual: number
  ach: number | null
}

export type MaintenanceTypeAchRow = {
  typeId: string
  typeName: string
  mtd: AchTriplet
  ytd: AchTriplet
}

export type MaintenanceAchievementDigest = {
  siteId: string
  siteName: string
  year: number
  month: number
  periodLabel: string
  mtdPeriodLabel: string
  mtd: AchTriplet
  ytd: AchTriplet
  byType: MaintenanceTypeAchRow[]

  /** Programs with MTD ACH below critical threshold (sorted worst first). */
  belowCritical: Array<{ typeName: string; ach: number }>
}

export const MAINT_ACH_ON_TRACK = 90

export const MAINT_ACH_CRITICAL = 70

function ach(actual: number, plan: number): number | null {
  if (plan === 0) return null

  return Math.round((actual / plan) * 1000) / 10
}

function formatAch(value: number | null): string {
  if (value == null) return 'n/a'

  return `${value.toFixed(1)}%`
}

export { formatAch }

/**
 * Digest for one site. If projectId omitted, picks first site that has YTD plan &gt; 0
 * (or first site) — useful for admin preview.
 */
export async function buildMaintenanceAchievementDigest(options: {
  year?: number
  month?: number

  /** Calendar day for MTD label end (default: today). */
  day?: number
  projectId?: string | null
}): Promise<MaintenanceAchievementDigest | null> {
  const now = new Date()
  const year = options.year ?? now.getFullYear()
  const month = options.month ?? now.getMonth() + 1
  const day = options.day ?? now.getDate()
  const monthIndex = month - 1

  const requestedProject = options.projectId?.trim() || null
  const data = await getFmsAchievement(year, requestedProject)
  const sitesWithPlan = data.siteTotals.filter(s => s.totalPlan > 0)

  const site =
    (requestedProject
      ? data.siteTotals.find(s => s.siteId === requestedProject)
      : null) ??
    sitesWithPlan[0] ??
    data.siteTotals[0]

  if (!site) return null

  const rows = data.programRows.filter(r => r.siteId === site.siteId)
  const byType: MaintenanceTypeAchRow[] = []

  let mtdPlan = 0
  let mtdActual = 0

  for (const row of rows) {
    const m = row.months[monthIndex] ?? { plan: 0, actual: 0, ach: null }
    mtdPlan += m.plan
    mtdActual += m.actual

    if (m.plan === 0 && row.totalPlan === 0) continue

    byType.push({
      typeId: row.typeId,
      typeName: row.typeName,
      mtd: { plan: m.plan, actual: m.actual, ach: ach(m.actual, m.plan) },
      ytd: { plan: row.totalPlan, actual: row.totalActual, ach: row.ach }
    })
  }

  byType.sort((a, b) => {
    const av = a.mtd.ach
    const bv = b.mtd.ach
    if (av == null && bv == null) return a.typeName.localeCompare(b.typeName)
    if (av == null) return 1
    if (bv == null) return -1

    return av - bv
  })

  const belowCritical = byType
    .filter(r => r.mtd.ach != null && r.mtd.ach < MAINT_ACH_CRITICAL && r.mtd.plan > 0)
    .map(r => ({ typeName: r.typeName, ach: r.mtd.ach as number }))

  const monthName = MONTH_LABELS[monthIndex] ?? String(month)

  return {
    siteId: site.siteId,
    siteName: site.siteName,
    year,
    month,
    periodLabel: `${monthName} ${year}`,
    mtdPeriodLabel: `1–${day} ${monthName} ${year}`,
    mtd: { plan: mtdPlan, actual: mtdActual, ach: ach(mtdActual, mtdPlan) },
    ytd: { plan: site.totalPlan, actual: site.totalActual, ach: site.ach },
    byType,
    belowCritical
  }
}
