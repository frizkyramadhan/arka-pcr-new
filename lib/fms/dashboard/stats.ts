/**
 * FMS dashboard stats — Total Unit, Plan/Actual bulan ini, selisih, % actual.
 * Port dari arka-fms/src/pages/api/dashboard/stats.js (unit count → FleetUnitCache).
 */
import { prisma } from '@/lib/prisma'

export async function getFmsDashboardStats() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const totalUnits = await prisma.fleetUnitCache.count()

  const plansThisMonth = await prisma.maintenancePlan.findMany({
    where: { year: currentYear, month: currentMonth },
    select: {
      sumPlan: true,
      _count: { select: { actuals: true } }
    }
  })

  const totalPlanThisMonth = plansThisMonth.reduce((s, p) => s + (p.sumPlan ?? 0), 0)
  const totalActualThisMonth = plansThisMonth.reduce((s, p) => s + (p._count?.actuals ?? 0), 0)
  const selisihBelum = Math.max(0, totalPlanThisMonth - totalActualThisMonth)

  const persenActual =
    totalPlanThisMonth > 0
      ? Math.round((totalActualThisMonth / totalPlanThisMonth) * 1000) / 10
      : null

  return {
    totalUnits,
    totalPlanThisMonth,
    totalActualThisMonth,
    selisihBelum,
    persenActual,
    meta: { currentYear, currentMonth }
  }
}
