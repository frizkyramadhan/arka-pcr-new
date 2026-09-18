/**
 * FMS dashboard achievement — PLAN/ACTUAL/ACH per site × program × month.
 * Port dari arka-fms/src/pages/api/dashboard/achievement.js
 */
import { prisma } from '@/lib/prisma'

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

function ach(actual: number, plan: number | null | undefined) {
  if (plan == null || plan === 0) return null

  return Math.round((actual / plan) * 1000) / 10
}

export async function getFmsAchievement(year: number, projectId: string | null) {
  const types = await prisma.maintenanceType.findMany({
    orderBy: { name: 'asc' }
  })

  const planProjectIds = await prisma.maintenancePlan.findMany({
    where: { year },
    select: { projectId: true }
  })
  const projectIds = [...new Set(planProjectIds.map(p => p.projectId))]
  const projects = projectIds.map(id => ({ id, name: id }))

  const planWhere: { year: number; projectId?: string } = { year }
  if (projectId) planWhere.projectId = projectId

  const plans = await prisma.maintenancePlan.findMany({
    where: planWhere,
    include: {
      maintenanceType: { select: { id: true, name: true } },
      _count: { select: { actuals: true } }
    }
  })

  const siteIds = [...new Set(plans.map(p => p.projectId))]
  const sites = siteIds.map(id => ({ id, name: id }))

  const byKey: Record<
    string,
    {
      siteId: string
      typeId: string
      typeName: string
      months: { plan: number; actual: number }[]
    }
  > = {}

  for (const p of plans) {
    const key = `${p.projectId}|${p.maintenanceTypeId}`
    if (!byKey[key]) {
      byKey[key] = {
        siteId: p.projectId,
        typeId: p.maintenanceTypeId,
        typeName: p.maintenanceType.name,
        months: Array.from({ length: 12 }, () => ({ plan: 0, actual: 0 }))
      }
    }
    const monthIndex = p.month - 1
    byKey[key].months[monthIndex].plan = p.sumPlan
    byKey[key].months[monthIndex].actual = p._count.actuals
  }

  const programRows: {
    siteId: string
    siteName: string
    typeId: string
    typeName: string
    months: { plan: number; actual: number; ach: number | null; label: string }[]
    totalPlan: number
    totalActual: number
    ach: number | null
  }[] = []
  for (const site of sites) {
    for (const type of types) {
      const key = `${site.id}|${type.id}`
      const row = byKey[key]

      const months = row
        ? row.months.map((m, i) => ({
            plan: m.plan,
            actual: m.actual,
            ach: ach(m.actual, m.plan),
            label: MONTH_LABELS[i]
          }))
        : Array.from({ length: 12 }, (_, i) => ({
            plan: 0,
            actual: 0,
            ach: null as number | null,
            label: MONTH_LABELS[i]
          }))

      const totalPlan = months.reduce((s, m) => s + m.plan, 0)
      const totalActual = months.reduce((s, m) => s + m.actual, 0)
      programRows.push({
        siteId: site.id,
        siteName: site.name,
        typeId: type.id,
        typeName: type.name,
        months,
        totalPlan,
        totalActual,
        ach: ach(totalActual, totalPlan)
      })
    }
  }

  const siteTotals = sites.map(site => {
    const rows = programRows.filter(r => r.siteId === site.id)
    const totalPlan = rows.reduce((s, r) => s + r.totalPlan, 0)
    const totalActual = rows.reduce((s, r) => s + r.totalActual, 0)

    return {
      siteId: site.id,
      siteName: site.name,
      totalPlan,
      totalActual,
      ach: ach(totalActual, totalPlan)
    }
  })

  const allPlan = siteTotals.reduce((s, t) => s + t.totalPlan, 0)
  const allActual = siteTotals.reduce((s, t) => s + t.totalActual, 0)

  return {
    year,
    projectId,
    monthLabels: MONTH_LABELS,
    projects,
    sites,
    types,
    programRows,
    siteTotals,
    allSiteAch: { totalPlan: allPlan, totalActual: allActual, ach: ach(allActual, allPlan) }
  }
}
